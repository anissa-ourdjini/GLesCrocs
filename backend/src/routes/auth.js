import { Router } from 'express';
import { pool } from '../db/pool.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { signAdminToken } from '../middleware/auth.js';

const router = Router();

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

// Public: info about auth state (whether at least one admin exists)
router.get('/info', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as c FROM users');
    const count = rows?.[0]?.c ?? 0;
    res.json({ hasAdmin: count > 0 });
  } catch (err) {
    res.status(200).json({ hasAdmin: true });
  }
});

// Single registration route
// - If no users exist yet: allow public creation of the first ADMIN and return a token
// - If users exist: require a valid ADMIN Bearer token in Authorization header
router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  try {
    const [countRows] = await pool.query('SELECT COUNT(*) as c FROM users');
    const hasAdmin = (countRows?.[0]?.c ?? 0) > 0;

    if (hasAdmin) {
      const token = getBearerToken(req);
      if (!token) return res.status(401).json({ error: 'Missing token' });
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'change_me');
        if (payload.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
      } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    const [exists] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (exists.length) return res.status(409).json({ error: 'User already exists' });

    if (password.length < 6) return res.status(400).json({ error: 'Password too short (min 6)' });
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query('INSERT INTO users (email, password_hash, role) VALUES (?,?,?)', [email, hash, 'ADMIN']);
    const user = { id: r.insertId, email, role: 'ADMIN' };

    // Return token for convenience when creating the first admin publicly
    const token = signAdminToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const [rows] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signAdminToken(user);
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

export default router;
