import express from 'express';
import {
  submitAnswer,
  getQuestionSubmissions,
  getTeamSubmissionForCurrentQuestion
} from '../controllers/submissionController.js';
import { teamAuth, adminAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/submit', teamAuth, submitAnswer);
router.get('/my-status', teamAuth, getTeamSubmissionForCurrentQuestion);
router.get('/question/:questionId', adminAuth, getQuestionSubmissions);

export default router;
