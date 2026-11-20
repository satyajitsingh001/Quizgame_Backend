import express from 'express';
import { adminLogin, teamLogin, getMe } from '../controllers/authController.js';

const router = express.Router();

router.post('/admin/login', adminLogin);
router.post('/team/login', teamLogin);
router.get('/me', getMe);

export default router;
