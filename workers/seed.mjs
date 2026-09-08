import { readFileSync, writeFileSync } from 'node:fs';
const cars = JSON.parse(readFileSync('../data/seed-cars.json', 'utf8'));

const esc = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const num = (n) => (n == null || n === '' ? 'NULL' : Number(n));

const lines = ['DELETE FROM cars;'];
for (const c of cars) {
  lines.push(
    `INSERT INTO cars (id, slug, title, description, make, model, year, price, mileage, condition, body_type, offer_type, drive_type, transmission, fuel_type, engine_size, cylinders, color, doors, features, safety_features, vin, featured, featured_image, gallery, video_url, address, lat, lng) VALUES (${c.id}, ${esc(c.slug)}, ${esc(c.title)}, ${esc(c.description)}, ${esc(c.make)}, ${esc(c.model)}, ${num(c.year)}, ${num(c.price)}, ${num(c.mileage)}, ${esc(c.condition)}, ${esc(c.body_type)}, ${esc(c.offer_type)}, ${esc(c.drive_type)}, ${esc(c.transmission)}, ${esc(c.fuel_type)}, ${num(c.engine_size)}, ${esc(c.cylinders)}, ${esc(c.color)}, ${esc(c.doors)}, ${esc(JSON.stringify(c.features || []))}, ${esc(JSON.stringify(c.safety_features || []))}, ${esc(c.vin)}, ${c.featured ? 1 : 0}, ${esc(c.featured_image)}, ${esc(JSON.stringify(c.gallery || []))}, ${esc(c.video_url)}, ${esc(c.address)}, ${num(c.lat)}, ${num(c.lng)});`
  );
}
writeFileSync('seed.sql', lines.join('\n') + '\n');
console.log('seed.sql written:', lines.length - 1, 'car inserts');
