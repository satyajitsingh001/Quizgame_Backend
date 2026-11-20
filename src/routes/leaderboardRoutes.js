import express from 'express';
import {
  getLeaderboard,
  getRoundLeaderboard,
  adjustScore,
  getScoreLedger
} from '../controllers/leaderboardController.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getLeaderboard);
router.get('/round/:round', getRoundLeaderboard);
router.get('/ledger', adminAuth, getScoreLedger);
router.post('/adjust', adminAuth, adjustScore);

export default router;
