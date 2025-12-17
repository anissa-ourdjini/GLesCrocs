import { pool } from '../db/pool.js';

function serviceWindowFactor(date = new Date()) {
  const hour = date.getHours();
  // 12-14 and 19-22 heavier load
  if ((hour >= 12 && hour < 14) || (hour >= 19 && hour < 22)) return 1.2;
  return 1.0;
}

export async function estimateWaitSecondsForOrder(orderId) {
  const conn = await pool.getConnection();
  try {
    const [[order]] = await conn.query('SELECT id, created_at FROM orders WHERE id=?', [orderId]);
    if (!order) return 300;

    const [items] = await conn.query(
      `SELECT oi.quantity, mi.avg_prep_seconds
       FROM order_items oi JOIN menu_items mi ON mi.id=oi.menu_item_id
       WHERE oi.order_id=?`, [orderId]
    );

    const [ahead] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM orders
       WHERE id < ? AND status IN ('VALIDATED','PREPARING','READY')`, [orderId]
    );

    const basePrep = items.reduce((sum, it) => sum + (it.avg_prep_seconds * it.quantity), 0);
    const backlogFactor = 1 + Math.min(0.05 * ahead[0].cnt, 2.0); // +5% par commande devant, max +200%
    const factor = serviceWindowFactor();

    const estimate = Math.round(basePrep * backlogFactor * factor / 2); // suppose 2 postes cuisine en parallèle
    return Math.max(120, estimate); // min 2 minutes
  } finally {
    conn.release();
  }
}
