import 'dotenv/config';
import { createPool } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';


const pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'glescrocs',
  multipleStatements: true
});

async function main() {
  // Correction du chemin pour pointer vers la racine du projet (compatible ESM)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const schemaPath = path.resolve(__dirname, '../../../schema.sql');
  const schema = fs.readFileSync(schemaPath);
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

  // No auto-created demo admin; admins must be created manually via /api/auth/register
  const [rows] = await pool.query('SELECT COUNT(*) as c FROM users');
  console.log(`Users present: ${rows?.[0]?.c ?? 0}`);

  const menu = [
    ['Sushi Mix 10p', 'Assortiment de sushi', 1200, 420, 1, '/asset/Images/sushi 15p.jpg'],
    ['Ramen Shoyu', 'Bouillon soja, porc, nouilles', 1100, 540, 1, '/asset/Images/Ramen.jpg'],
    ['Donburi Poulet', 'Riz, poulet teriyaki', 1000, 420, 1, '/asset/Images/Donburi poulet.jpg'],
    ['Miso Soup', 'Soupe miso', 300, 180, 1, '/asset/Images/Soupe misot.jpg']
  ];
  for (const m of menu) {
    const [rows] = await pool.query('SELECT id FROM menu_items WHERE name=?', [m[0]]);
    if (rows.length === 0) {
      await pool.query('INSERT INTO menu_items (name, description, price_cents, avg_prep_seconds, active, image_url) VALUES (?,?,?,?,?,?)', m);
    } else {
      // Met à jour l'image si besoin
      await pool.query('UPDATE menu_items SET image_url=? WHERE name=?', [m[5], m[0]]);
    }
  }
  console.log('Menu seed done');

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
