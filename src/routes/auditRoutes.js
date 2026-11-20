import express from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', adminAuth, getAuditLogs);

export default router;
