
import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { Server } from 'socket.io';
import { pool } from './db/pool.js';
import authRouter from './routes/auth.js';
import menuRouter from './routes/menu.js';
import uploadsRouter from './routes/uploads.js';
import ordersRouter from './routes/orders.js';
import { estimateQueue } from './services/queueAI.js';


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

app.set('io', io);
app.set('db', pool);

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Static serving for uploaded files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../public/uploads');
app.use('/uploads', express.static(uploadsDir));

// Route de test pour la racine
app.get('/', (req, res) => {
  res.send('API GLesCrocs fonctionne !');
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    const [tables] = await pool.query("SHOW TABLES LIKE 'menu_items'");
    res.json({ ok: true, db: { connected: !!rows?.length, hasMenuTable: tables?.length > 0, database: process.env.DB_NAME || 'glescrocs' } });
  } catch (err) {
    console.error('Health DB check failed:', err.message);
    res.status(200).json({ ok: true, db: { connected: false, error: err.message } });
  }
});

// Routers
app.use('/api/auth', authRouter);
app.use('/api/menu', menuRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/uploads', uploadsRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// Socket.io queue emission logic
async function emitQueue(io) {
  // Récupère la file d'attente et l'envoie à tous les clients
  const [[{ current }]] = await pool.query("SELECT COALESCE(MAX(ticket_number),0) AS current FROM orders WHERE status='SERVED'");
  const [queue] = await pool.query(
    `SELECT o.ticket_number, o.status, o.estimated_wait_seconds, o.id,
      COALESCE(SUM(oi.quantity * mi.avg_prep_seconds), 0) AS avg_prep_seconds
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
    WHERE ((o.ticket_number IS NOT NULL AND o.status IN ('VALIDATED','PREPARING','READY') AND o.ticket_number > ?)
      OR (o.status='PENDING' AND o.ticket_number IS NULL))
    GROUP BY o.id
    ORDER BY COALESCE(o.ticket_number, o.id) ASC LIMIT 50`, [current]
  );
  const queueWithEstimation = estimateQueue(queue, current);
  io.emit('queue_update', { currentServing: current, queue: queueWithEstimation });
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  emitQueue(io); // Envoie la file d'attente à chaque nouveau client
  socket.on('disconnect', () => console.log('socket disconnected', socket.id));
});



const PORT = Number(process.env.PORT || 4000);
server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`CORS origin: ${process.env.CORS_ORIGIN || '*'}`);
  console.log(`DB: ${process.env.DB_USER || 'root'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}/${process.env.DB_NAME || 'glescrocs'}`);
});
