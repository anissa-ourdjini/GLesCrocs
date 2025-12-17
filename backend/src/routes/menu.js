import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, description, price_cents, avg_prep_seconds, image_url, active FROM menu_items WHERE active=1 ORDER BY id DESC');
  res.json(rows);
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, description, price_cents, avg_prep_seconds, image_url, active = 1 } = req.body || {};
  console.log('Creating menu item:', { name, price_cents, active });
  if (!name || price_cents == null) {
    console.log('Validation failed: missing name or price_cents');
    return res.status(400).json({ error: 'name and price_cents required' });
  }
  try {
    const [r] = await pool.query(
      'INSERT INTO menu_items (name, description, price_cents, avg_prep_seconds, image_url, active) VALUES (?,?,?,?,?,?)',
      [name, description || '', Number(price_cents), Number(avg_prep_seconds || 300), image_url || null, active ? 1 : 0]
    );
    console.log('Menu item created:', r.insertId);
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    console.error('Error creating menu item:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, price_cents, avg_prep_seconds, image_url, active } = req.body || {};
  await pool.query(
    'UPDATE menu_items SET name=?, description=?, price_cents=?, avg_prep_seconds=?, image_url=?, active=? WHERE id=?',
    [name, description || '', Number(price_cents), Number(avg_prep_seconds || 300), image_url || null, active ? 1 : 0, id]
  );
  res.json({ ok: true });
});

export default router;
