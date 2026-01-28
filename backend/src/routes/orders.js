import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';
import { estimateWaitSecondsForOrder } from '../services/estimator.js';

const router = Router();

function io(req) {
  return req.app.get('io');
}

// Fonction helper pour émettre les commandes d'un client
async function emitClientOrders(io, client_uid) {
  if (!client_uid) return;
  const [orders] = await pool.query(
    `SELECT o.id, o.ticket_number, o.status, o.order_number, o.customer_name, o.created_at, o.estimated_wait_seconds
    FROM orders o
    WHERE o.client_uid = ? AND o.status != 'CANCELLED'
    ORDER BY o.created_at DESC LIMIT 20`,
    [client_uid]
  );
  io.to(`client_${client_uid}`).emit('client_orders_update', { orders });
}

// Annulation d'une commande (client)
router.post('/:id/cancel', async (req, res) => {
  const id = Number(req.params.id);
  const [[order]] = await pool.query('SELECT status, client_uid FROM orders WHERE id=?', [id]);
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  if (order.status === 'SERVED' || order.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Commande déjà servie ou annulée' });
  }
  await pool.query('UPDATE orders SET status="CANCELLED" WHERE id=?', [id]);
  io(req).emit('queue_update');
  // Notifie le client spécifique
  if (order?.client_uid) {
    await emitClientOrders(io(req), order.client_uid);
  }
  res.json({ ok: true });
});

router.get('/queue', async (req, res) => {
    const [[{ current }]] = await pool.query("SELECT COALESCE(MAX(ticket_number),0) AS current FROM orders WHERE status='SERVED'");
    const [queue] = await pool.query(
      `SELECT o.ticket_number, o.status, o.id, o.client_uid, o.order_number, o.customer_name, o.estimated_wait_seconds
      FROM orders o
      WHERE ((o.ticket_number IS NOT NULL AND o.status IN ('VALIDATED','PREPARING','READY') AND o.ticket_number > ?)
        OR (o.status='PENDING' AND o.ticket_number IS NULL))
      ORDER BY COALESCE(o.ticket_number, o.id) ASC LIMIT 50`, [current]
    );
    res.json({ currentServing: current, queue });
});

router.post('/', async (req, res, next) => {
  const { customer_name, items, client_uid } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items required' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Calcul du prochain numéro de commande pour ce client
    let order_number = 1;
    if (client_uid) {
      const [[row]] = await conn.query('SELECT COALESCE(MAX(order_number),0)+1 AS next_order FROM orders WHERE client_uid=?', [client_uid]);
      order_number = row.next_order;
    }
    const [r] = await conn.query('INSERT INTO orders (customer_name, client_uid, order_number, status) VALUES (?, ?, ?, "PENDING")', [customer_name || null, client_uid || null, order_number]);
    const orderId = r.insertId;
    for (const it of items) {
      await conn.query('INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?,?,?)', [orderId, Number(it.menu_item_id), Number(it.quantity || 1)]);
    }
    const estimatedWait = await estimateWaitSecondsForOrder(orderId);
    await conn.query('UPDATE orders SET estimated_wait_seconds=? WHERE id=?', [estimatedWait, orderId]);
    await conn.commit();

    io(req).emit('order_update', { orderId, status: 'PENDING' });
    // Notifie le client spécifique de sa nouvelle commande
    if (client_uid) {
      emitClientOrders(io(req), client_uid);
    }
    res.status(201).json({ id: orderId, order_number });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

router.post('/:id/validate', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [[order]] = await pool.query('SELECT client_uid FROM orders WHERE id=?', [id]);
  const [[{ nextTicket }]] = await pool.query('SELECT COALESCE(MAX(ticket_number),0)+1 AS nextTicket FROM orders');
  await pool.query('UPDATE orders SET status="VALIDATED", ticket_number=?, validated_at=NOW() WHERE id=?', [nextTicket, id]);
  io(req).emit('queue_update');
  if (order?.client_uid) {
    await emitClientOrders(io(req), order.client_uid);
  }
  res.json({ ok: true, ticket_number: nextTicket });
});

router.post('/:id/ready', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [[order]] = await pool.query('SELECT client_uid FROM orders WHERE id=?', [id]);
  await pool.query('UPDATE orders SET status="READY", ready_at=NOW() WHERE id=?', [id]);
  io(req).emit('queue_update');
  if (order?.client_uid) {
    await emitClientOrders(io(req), order.client_uid);
  }
  res.json({ ok: true });
});

router.post('/:id/served', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [[order]] = await pool.query('SELECT client_uid FROM orders WHERE id=?', [id]);
  await pool.query('UPDATE orders SET status="SERVED", served_at=NOW() WHERE id=?', [id]);
  io(req).emit('queue_update');
  if (order?.client_uid) {
    await emitClientOrders(io(req), order.client_uid);
  }
  res.json({ ok: true });
});

// GET /api/orders/:id/items -> détails items de la commande
router.get('/:id/items', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [items] = await pool.query(
      `SELECT oi.id, oi.quantity, m.name, m.price_cents, m.description
       FROM order_items oi
       JOIN menu_items m ON oi.menu_item_id = m.id
       WHERE oi.order_id = ?`,
      [id]
    );
    res.json(items || []);
  } catch (err) {
    console.error('Erreur items:', err);
    res.json([]);
  }
});

export default router;
