import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';
import { estimateWaitSecondsForOrder } from '../services/estimator.js';

const router = Router();

function io(req) {
  return req.app.get('io');
}

router.get('/queue', async (req, res) => {
    const [[{ current }]] = await pool.query("SELECT COALESCE(MAX(ticket_number),0) AS current FROM orders WHERE status='SERVED'");
    // Inclure les commandes PENDING sans ticket_number
    const [queue] = await pool.query(
     `SELECT ticket_number, status, estimated_wait_seconds, id
      FROM orders
      WHERE (ticket_number IS NOT NULL AND status IN ('VALIDATED','PREPARING','READY') AND ticket_number > ?)
        OR (status='PENDING' AND ticket_number IS NULL)
      ORDER BY COALESCE(ticket_number, id) ASC LIMIT 50`, [current]
    );
    res.json({ currentServing: current, queue });
});

router.post('/', async (req, res, next) => {
  const { customer_name, items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items required' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query('INSERT INTO orders (customer_name, status) VALUES (?, "PENDING")', [customer_name || null]);
    const orderId = r.insertId;
    for (const it of items) {
      await conn.query('INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?,?,?)', [orderId, Number(it.menu_item_id), Number(it.quantity || 1)]);
    }
    await conn.commit();

    const estimate = await estimateWaitSecondsForOrder(orderId);
    await pool.query('UPDATE orders SET estimated_wait_seconds=? WHERE id=?', [estimate, orderId]);

    io(req).emit('order_update', { orderId, status: 'PENDING', estimated_wait_seconds: estimate });
    res.status(201).json({ id: orderId, estimated_wait_seconds: estimate });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

router.post('/:id/validate', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [[{ nextTicket }]] = await pool.query('SELECT COALESCE(MAX(ticket_number),0)+1 AS nextTicket FROM orders');
  await pool.query('UPDATE orders SET status="VALIDATED", ticket_number=?, validated_at=NOW() WHERE id=?', [nextTicket, id]);
  const estimate = await estimateWaitSecondsForOrder(id);
  await pool.query('UPDATE orders SET estimated_wait_seconds=? WHERE id=?', [estimate, id]);
  io(req).emit('queue_update');
  res.json({ ok: true, ticket_number: nextTicket, estimated_wait_seconds: estimate });
});

router.post('/:id/ready', requireAdmin, async (req, res) => {
  const ticketNumber = Number(req.params.id);
  await pool.query('UPDATE orders SET status="READY", ready_at=NOW() WHERE ticket_number=?', [ticketNumber]);
  io(req).emit('queue_update');
  res.json({ ok: true });
});

router.post('/:id/served', requireAdmin, async (req, res) => {
  const ticketNumber = Number(req.params.id);
  await pool.query('UPDATE orders SET status="SERVED", served_at=NOW() WHERE ticket_number=?', [ticketNumber]);
  io(req).emit('queue_update');
  res.json({ ok: true });
});

export default router;
