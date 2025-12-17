import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, '../../public/uploads');

// Ensure upload directory exists
fs.mkdirSync(uploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsRoot);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
    const stamp = Date.now();
    cb(null, `${base}-${stamp}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/uploads -> { url }
router.post('/', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    console.error('No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }
  console.log('File uploaded successfully:', req.file.filename);
  // Return relative URL that works from any origin
  const filename = req.file.filename;
  const url = `/uploads/${filename}`;
  res.json({ url });
});

// Error handling for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err.message);
    return res.status(400).json({ error: err.message });
  } else if (err) {
    console.error('Upload error:', err.message);
    return res.status(400).json({ error: err.message });
  }
  next();
});

export default router;
