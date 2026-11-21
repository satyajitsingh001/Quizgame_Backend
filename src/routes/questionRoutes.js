import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion
} from '../controllers/questionController.js';
import { adminAuth } from '../middleware/auth.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure canonical uploads folder exists (both in backend/uploads and cwd/uploads)
const canonicalUploadDir = path.resolve(__dirname, '../../uploads');
const cwdUploadDir = path.resolve('uploads');

const uploadDir = fs.existsSync(canonicalUploadDir) ? canonicalUploadDir : cwdUploadDir;
if (!fs.existsSync(canonicalUploadDir)) {
  fs.mkdirSync(canonicalUploadDir, { recursive: true });
}
if (!fs.existsSync(cwdUploadDir)) {
  try { fs.mkdirSync(cwdUploadDir, { recursive: true }); } catch {}
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, canonicalUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `defect-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Image upload endpoint
router.post('/upload-image', adminAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image uploaded' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  return res.status(200).json({ success: true, imageUrl });
});

// Questions CRUD
router.get('/', getQuestions);
router.get('/:id', getQuestionById);
router.post('/', adminAuth, createQuestion);
router.put('/:id', adminAuth, updateQuestion);
router.delete('/:id', adminAuth, deleteQuestion);

export default router;
