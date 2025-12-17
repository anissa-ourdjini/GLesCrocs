import 'dotenv/config';
import { createPool } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'fs';

const pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'glescrocs',
  multipleStatements: true
});

async function main() {
  const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url));
  await pool.query(schema.toString());

  // Add image_url column if it doesn't exist (migration)
  try {
    await pool.query('ALTER TABLE menu_items ADD COLUMN image_url VARCHAR(500) AFTER avg_prep_seconds');
    console.log('Column image_url added to menu_items');
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') {
      console.error('Error adding image_url column:', e.message);
    }
  }

  // Always ensure the demo admin exists
  await pool.query('DELETE FROM users WHERE email=?', ['admin@demo.local']);
  const hash = await bcrypt.hash('Admin@123', 10);
  const [result] = await pool.query('INSERT INTO users (email, password_hash, role) VALUES (?,?,?)', ['admin@demo.local', hash, 'ADMIN']);
  console.log('✓ Admin created: admin@demo.local / Admin@123 (ID:', result.insertId, ')');

  const menu = [
    ['Sushi Mix 10p', 'Assortiment de sushi', 1200, 420, 1],
    ['Ramen Shoyu', 'Bouillon soja, porc, nouilles', 1100, 540, 1],
    ['Donburi Poulet', 'Riz, poulet teriyaki', 1000, 420, 1],
    ['Miso Soup', 'Soupe miso', 300, 180, 1]
  ];
  for (const m of menu) {
    const [rows] = await pool.query('SELECT id FROM menu_items WHERE name=?', [m[0]]);
    if (rows.length === 0) {
      await pool.query('INSERT INTO menu_items (name, description, price_cents, avg_prep_seconds, active) VALUES (?,?,?,?,?)', m);
    }
  }
  console.log('Menu seed done');

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
