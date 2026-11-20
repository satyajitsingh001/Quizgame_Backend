import express from 'express';
import {
  registerTeam,
  getAllTeams,
  updateTeam,
  approveRejectTeam,
  deleteTeam
} from '../controllers/teamController.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

// Public registration endpoint
router.post('/register', registerTeam);

// Protected Admin endpoints
router.get('/', adminAuth, getAllTeams);
router.put('/:id', adminAuth, updateTeam);
router.patch('/:id/status', adminAuth, approveRejectTeam);
router.delete('/:id', adminAuth, deleteTeam);

export default router;
