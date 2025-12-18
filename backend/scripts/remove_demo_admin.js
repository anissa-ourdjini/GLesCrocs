import { createConnection } from 'mysql2/promise';

async function main() {
  const conn = await createConnection({ host: 'localhost', user: 'root', password: '', database: 'glescrocs' });
  const [res] = await conn.query("DELETE FROM users WHERE email='admin@demo.local'");
  console.log('Deleted demo admin rows:', res.affectedRows);
  const [rows] = await conn.query('SELECT id,email,role FROM users ORDER BY id');
  console.log('Remaining users:', rows);
  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
