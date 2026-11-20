import express from 'express';
import {
  getGameState,
  activateRound,
  startQuestion,
  pauseQuestion,
  resumeQuestion,
  endQuestion,
  revealAnswer,
  resetCompetition
} from '../controllers/gameController.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/state', getGameState);
router.post('/round/activate', adminAuth, activateRound);
router.post('/question/start', adminAuth, startQuestion);
router.post('/question/pause', adminAuth, pauseQuestion);
router.post('/question/resume', adminAuth, resumeQuestion);
router.post('/question/end', adminAuth, endQuestion);
router.post('/question/reveal', adminAuth, revealAnswer);
router.post('/reset', adminAuth, resetCompetition);

export default router;
