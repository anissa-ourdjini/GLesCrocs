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
import ordersRouter from './routes/orders.js';
import uploadsRouter from './routes/uploads.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET','POST','PUT','DELETE','PATCH']
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

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    // Optional: check at least one known table exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'menu_items'");
    res.json({ ok: true, db: { connected: !!rows?.length, hasMenuTable: tables?.length > 0, database: process.env.DB_NAME || 'glescrocs' } });
  } catch (err) {
    console.error('Health DB check failed:', err.message);
    res.status(200).json({ ok: true, db: { connected: false, error: err.message } });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/menu', menuRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/uploads', uploadsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = Number(process.env.PORT || 4000);
server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`CORS origin: ${process.env.CORS_ORIGIN || '*'}`);
  console.log(`DB: ${process.env.DB_USER || 'root'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}/${process.env.DB_NAME || 'glescrocs'}`);
});

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  socket.on('disconnect', () => console.log('socket disconnected', socket.id));
});
