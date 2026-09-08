import { Hono } from 'hono';

type Env = {
  DB: D1Database;
  FRONTEND_ORIGIN: string;
  SESSION_SECRET: string;
  CONTACT_EMAIL: string;
  MAILCHIMP_API_KEY?: string;
  MAILCHIMP_LIST_ID?: string;
  MAILCHIMP_SERVER?: string;
  MAILCHANNELS_SENDER?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  await next();
  c.header('Access-Control-Allow-Origin', c.env.FRONTEND_ORIGIN || '*');
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
});
app.options('*', (c) => c.text('', 204));

app.onError((err, c) => {
  console.error(err instanceof Error ? err.message : String(err));
  return c.json({ error: 'internal error' }, 500);
});

// ---------- helpers ----------
const tryJson = (s: string) => {
  try { return JSON.parse(s); } catch { return []; }
};
function carRow(r: Record<string, unknown>) {
  return {
    ...r,
    features: tryJson((r.features as string) || '[]'),
    safety_features: tryJson((r.safety_features as string) || '[]'),
    gallery: tryJson((r.gallery as string) || '[]'),
    featured: !!(r.featured as number),
  };
}

// ---------- password hashing (WebCrypto PBKDF2; Workers lacks deriveBits) ----------
function bufToHex(b: ArrayBuffer | Uint8Array) { return [...new Uint8Array(b as ArrayBuffer)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
async function hashPassword(password: string, salt: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const derived = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    true,
    ['sign'],
  );
  return bufToHex(await crypto.subtle.exportKey('raw', derived));
}

// ---------- health ----------
app.get('/api/health', (c) => c.json({ ok: true, now: new Date().toISOString() }));

// ---------- inventory ----------
app.get('/api/cars', async (c) => {
  const q = c.req.query();
  const where: string[] = [];
  const params: unknown[] = [];

  const eq = (field: string, val?: string) => { if (val) { where.push(`${field} = ?`); params.push(val); } };
  eq('make', q.make);
  eq('model', q.model);
  eq('condition', q.condition);
  eq('body_type', q.body_type);
  eq('offer_type', q.offer_type);
  eq('drive_type', q.drive_type);
  eq('transmission', q.transmission);
  eq('fuel_type', q.fuel_type);
  eq('color', q.color);
  eq('cylinders', q.cylinders);

  const range = (field: string, min?: string, max?: string) => {
    if (min) { where.push(`${field} >= ?`); params.push(Number(min)); }
    if (max) { where.push(`${field} <= ?`); params.push(Number(max)); }
  };
  range('year', q.year_min, q.year_max);
  range('price', q.price_min, q.price_max);
  range('mileage', q.mileage_min, q.mileage_max);

  if (q.search) {
    where.push('(title LIKE ? OR description LIKE ? OR make LIKE ? OR model LIKE ? OR vin LIKE ?)');
    const s = `%${q.search}%`;
    params.push(s, s, s, s, s);
  }
  if (q.featured === '1') where.push('featured = 1');

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortMap: Record<string, string> = {
    price_asc: 'price ASC', price_desc: 'price DESC', year_desc: 'year DESC',
    year_asc: 'year ASC', mileage_asc: 'mileage ASC', newest: 'created_at DESC',
  };
  const order = sortMap[q.sort || 'newest'] || 'created_at DESC';
  const limit = Math.min(Number(q.limit || 50), 200);
  const offset = Number(q.offset || 0);

  const total = await c.env.DB.prepare(`SELECT COUNT(*) n FROM cars ${whereSql}`).bind(...params).first<{ n: number }>();
  const rows = await c.env.DB.prepare(
    `SELECT * FROM cars ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  return c.json({ total: total?.n ?? 0, count: rows.results.length, results: rows.results.map(carRow) });
});

app.get('/api/facets', async (c) => {
  const fields = ['make', 'body_type', 'condition', 'drive_type', 'transmission', 'fuel_type', 'color', 'offer_type'];
  const out: Record<string, string[]> = {};
  for (const f of fields) {
    const rows = await c.env.DB.prepare(`SELECT DISTINCT ${f} v FROM cars WHERE ${f} IS NOT NULL AND ${f} != '' ORDER BY ${f}`).all<{ v: string }>();
    out[f] = rows.results.map((r) => r.v);
  }
  const pr = await c.env.DB.prepare('SELECT MIN(price) min, MAX(price) max, MIN(year) ymin, MAX(year) ymax FROM cars').first<{ min: number; max: number; ymin: number; ymax: number }>();
  return c.json({ facets: out, price: pr ? { min: pr.min, max: pr.max } : null, year: pr ? { min: pr.ymin, max: pr.ymax } : null });
});

app.get('/api/cars/:id', async (c) => {
  const id = c.req.param('id');
  const r = await c.env.DB.prepare('SELECT * FROM cars WHERE id = ?').bind(Number(id)).first();
  if (!r) return c.json({ error: 'not found' }, 404);
  return c.json(carRow(r));
});

app.get('/api/compare', async (c) => {
  const ids = (c.req.query('ids') || '').split(',').map((x) => Number(x)).filter((x) => !isNaN(x));
  if (!ids.length) return c.json({ results: [] });
  const rows = await c.env.DB.prepare(
    `SELECT * FROM cars WHERE id IN (${ids.map(() => '?').join(',')})`
  ).bind(...ids).all();
  return c.json({ results: rows.results.map(carRow) });
});

// ---------- contact form ----------
app.post('/api/contact', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const name = String(b.name || '').slice(0, 200);
  const email = String(b.email || '').slice(0, 200);
  const phone = String(b.phone || '').slice(0, 60);
  const message = String(b.message || '').slice(0, 5000);
  const carId = b.car_id ? Number(b.car_id) : null;
  if (!email || !message) return c.json({ error: 'email and message are required' }, 400);

  await c.env.DB.prepare(
    'INSERT INTO leads (name, email, phone, message, car_id) VALUES (?, ?, ?, ?, ?)'
  ).bind(name, email, phone, message, carId).run();

  // email via MailChannels (Cloudflare-native, free) — best-effort
  if (c.env.MAILCHANNELS_SENDER && c.env.CONTACT_EMAIL) {
    try {
      await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: c.env.CONTACT_EMAIL, name: 'Sales' }] }],
          from: { email: c.env.MAILCHANNELS_SENDER, name: 'Milford Carvana Cars' },
          subject: `New inquiry: ${name || email}`,
          content: [{ type: 'text/plain', value: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nCar: ${carId || 'n/a'}\n\n${message}` }],
        }),
      });
    } catch {}
  }
  return c.json({ ok: true });
});

// ---------- mailchimp subscribe ----------
app.post('/api/subscribe', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const email = String(b.email || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.json({ error: 'invalid email' }, 400);
  await c.env.DB.prepare('INSERT OR IGNORE INTO subscribers (email) VALUES (?)').bind(email).run();

  if (c.env.MAILCHIMP_API_KEY && c.env.MAILCHIMP_LIST_ID && c.env.MAILCHIMP_SERVER) {
    try {
      await fetch(`https://${c.env.MAILCHIMP_SERVER}.api.mailchimp.com/3.0/lists/${c.env.MAILCHIMP_LIST_ID}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': `apikey ${c.env.MAILCHIMP_API_KEY}` },
        body: JSON.stringify({ email_address: email, status: 'subscribed' }),
      });
    } catch {}
  }
  return c.json({ ok: true });
});

// ---------- auth ----------
app.post('/api/auth/register', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  const name = String(b.name || '').slice(0, 100);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 8) {
    return c.json({ error: 'valid email and password (min 8 chars) required' }, 400);
  }
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return c.json({ error: 'email already registered' }, 409);

  const salt = crypto.randomUUID();
  const hash = await hashPassword(password, salt);
  await c.env.DB.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
    .bind(email, `${salt}:${hash}`, name).run();
  return c.json({ ok: true });
});

app.post('/api/auth/login', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  const u = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<{ id: number; password_hash: string; name: string; email: string }>();
  if (!u) return c.json({ error: 'invalid credentials' }, 401);
  const [salt, hash] = u.password_hash.split(':');
  const computed = await hashPassword(password, salt || '');
  if (computed !== hash) return c.json({ error: 'invalid credentials' }, 401);

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  await c.env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, u.id, expires).run();

  c.header('Set-Cookie', `session=${token}; HttpOnly; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax`);
  return c.json({ ok: true, token, user: { id: u.id, email: u.email, name: u.name } });
});

app.post('/api/auth/logout', async (c) => {
  const token = (c.req.header('Cookie') || '').match(/session=([^;]+)/)?.[1];
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  c.header('Set-Cookie', 'session=; HttpOnly; Path=/; Max-Age=0');
  return c.json({ ok: true });
});

app.get('/api/auth/me', async (c) => {
  let token = (c.req.header('Cookie') || '').match(/session=([^;]+)/)?.[1];
  const auth = c.req.header('Authorization') || '';
  if (auth.startsWith('Bearer ')) token = auth.slice(7);
  if (!token) return c.json({ user: null }, 401);
  const s = await c.env.DB.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').bind(token).first<{ user_id: number; expires_at: string }>();
  if (!s || (s.expires_at && new Date(s.expires_at) < new Date())) return c.json({ user: null }, 401);
  const u = await c.env.DB.prepare('SELECT id, email, name FROM users WHERE id = ?').bind(s.user_id).first();
  return c.json({ user: u || null });
});

export default app;
