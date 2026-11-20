import express from 'express';
import { exportReport } from '../controllers/reportController.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/:type/:format', adminAuth, exportReport);

export default router;
