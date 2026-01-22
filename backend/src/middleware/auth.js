import jwt from 'jsonwebtoken';

export function signAdminToken(email, expiresIn = '7d') {
  return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn });
}

export function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requis' });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}
