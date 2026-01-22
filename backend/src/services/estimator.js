import { pool } from '../db/pool.js';

// Estimation simple du temps d'attente
export async function estimateWaitSecondsForOrder(orderId) {
  const conn = await pool.getConnection();
  try {
    const [items] = await conn.query(
      `SELECT COALESCE(SUM(oi.quantity * mi.avg_prep_seconds), 300) AS total
       FROM order_items oi
       JOIN menu_items mi ON mi.id = oi.menu_item_id
       WHERE oi.order_id = ?`,
      [orderId]
    );
    return items[0]?.total || 300;
  } finally {
    conn.release();
  }
}
