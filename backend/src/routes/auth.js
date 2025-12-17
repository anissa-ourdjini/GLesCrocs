import { Router } from 'express';
import { pool } from '../db/pool.js';
import bcrypt from 'bcryptjs';
import { signAdminToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  console.log('Login attempt:', { email, hasPassword: !!password });
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const [rows] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
  console.log('Found users:', rows.length);
  const user = rows[0];
  if (!user) {
    console.log('User not found:', email);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  console.log('Password match:', ok);
  if (!ok) {
    console.log('Password mismatch for user:', email);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signAdminToken(user);
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

// Admin registration - only authenticated admins can register new admins
router.post('/register', requireAdmin, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const [exists] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (exists.length) return res.status(409).json({ error: 'User already exists' });

  if (password.length < 6) return res.status(400).json({ error: 'Password too short (min 6)' });
  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query('INSERT INTO users (email, password_hash, role) VALUES (?,?,?)', [email, hash, 'ADMIN']);
  const user = { id: r.insertId, email, role: 'ADMIN' };
  res.status(201).json({ user });
});

export default router;
