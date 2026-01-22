
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/menu : retourne uniquement les plats actifs
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, description, price_cents, avg_prep_seconds, image_url, active FROM menu_items WHERE active=1 ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/menu : création d'un plat (admin)
router.post('/', requireAdmin, async (req, res) => {
  const { name, description, price_cents, avg_prep_seconds, image_url, active = 1 } = req.body || {};
  if (!name || price_cents == null) {
    return res.status(400).json({ error: 'name and price_cents required' });
  }
  try {
    const [r] = await pool.query(
      'INSERT INTO menu_items (name, description, price_cents, avg_prep_seconds, image_url, active) VALUES (?,?,?,?,?,?)',
      [name, description || '', Number(price_cents), Number(avg_prep_seconds || 300), image_url || null, active ? 1 : 0]
    );
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/menu/:id : modification d'un plat (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, price_cents, avg_prep_seconds, image_url, active } = req.body || {};
  if (!name || price_cents == null) {
    return res.status(400).json({ error: 'name and price_cents required' });
  }
  try {
    await pool.query(
      'UPDATE menu_items SET name=?, description=?, price_cents=?, avg_prep_seconds=?, image_url=?, active=? WHERE id=?',
      [name, description || '', Number(price_cents), Number(avg_prep_seconds || 300), image_url || null, active ? 1 : 0, id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
