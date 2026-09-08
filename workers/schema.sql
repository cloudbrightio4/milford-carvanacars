-- Milford Carvana Cars — D1 schema

CREATE TABLE IF NOT EXISTS cars (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE,
  title TEXT,
  description TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  price REAL,
  currency TEXT DEFAULT 'USD',
  mileage INTEGER,
  condition TEXT,
  body_type TEXT,
  offer_type TEXT DEFAULT 'For Sale',
  drive_type TEXT,
  transmission TEXT,
  fuel_type TEXT,
  engine_size REAL,
  cylinders TEXT,
  color TEXT,
  doors TEXT,
  features TEXT,
  safety_features TEXT,
  vin TEXT,
  featured INTEGER DEFAULT 0,
  featured_image TEXT,
  gallery TEXT,
  video_url TEXT,
  address TEXT,
  lat REAL,
  lng REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cars_make ON cars(make);
CREATE INDEX IF NOT EXISTS idx_cars_model ON cars(model);
CREATE INDEX IF NOT EXISTS idx_cars_price ON cars(price);
CREATE INDEX IF NOT EXISTS idx_cars_year ON cars(year);
CREATE INDEX IF NOT EXISTS idx_cars_offer ON cars(offer_type);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  car_id INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
