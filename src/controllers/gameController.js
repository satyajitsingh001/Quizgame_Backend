import GameState from '../models/GameState.js';
import Question from '../models/Question.js';
import Team from '../models/Team.js';
import Response from '../models/Response.js';
import ScoreLedger from '../models/ScoreLedger.js';
import CompetitionSettings from '../models/CompetitionSettings.js';
import { createAuditLog } from '../middleware/auth.js';
import { evaluateRound1, evaluateRound2, evaluateRound3 } from '../utils/scoringEngine.js';

export const getGameState = async (req, res) => {
  try {
    let state = await GameState.findOne({ key: 'LIVE_GAME_STATE' }).populate('currentQuestionId');
    if (!state) {
      state = await GameState.create({ key: 'LIVE_GAME_STATE' });
    }

    let questionData = null;
    if (state.currentQuestionId) {
      // If user is not admin, hide correct answers unless revealed
      const isAdmin = req.admin !== undefined;
      if (isAdmin || state.questionStatus === 'REVEALED') {
        questionData = state.currentQuestionId;
      } else {
        questionData = state.currentQuestionId.toParticipantJSON();
      }
    }

    // Calculate real-time remaining seconds
    let remaining = 0;
    if (state.questionStatus === 'ACTIVE' && state.endTime) {
      remaining = Math.max(0, Math.ceil((new Date(state.endTime) - new Date()) / 1000));
    }

    // Comprehensive detection of all completed/evaluated questions from ScoreLedger & state
    const ledgerAgg = await ScoreLedger.aggregate([
      { $match: { isAdjustment: false } },
      { $group: { _id: { round: '$round', questionNumber: '$questionNumber', questionId: '$questionId' } } }
    ]);

    const completedMap = new Map();
    ledgerAgg.forEach(l => {
      const key = `${l._id.round}_${l._id.questionNumber}`;
      completedMap.set(key, {
        round: Number(l._id.round),
        questionNumber: Number(l._id.questionNumber),
        questionId: l._id.questionId
      });
    });

    if (Array.isArray(state.completedQuestions)) {
      state.completedQuestions.forEach(cq => {
        const key = `${cq.round}_${cq.questionNumber}`;
        if (!completedMap.has(key)) {
          completedMap.set(key, {
            round: Number(cq.round),
            questionNumber: Number(cq.questionNumber),
            questionId: cq.questionId,
            completedAt: cq.completedAt
          });
        }
      });
    }

    if (state.questionStatus === 'REVEALED' && state.currentRound && state.currentQuestionNumber) {
      const key = `${state.currentRound}_${state.currentQuestionNumber}`;
      if (!completedMap.has(key)) {
        completedMap.set(key, {
          round: Number(state.currentRound),
          questionNumber: Number(state.currentQuestionNumber),
          questionId: state.currentQuestionId?._id || state.currentQuestionId
        });
      }
    }

    const allCompleted = Array.from(completedMap.values());
    state.completedQuestions = allCompleted;

    return res.status(200).json({
      success: true,
      state: {
        competitionTitle: state.competitionTitle,
        status: state.status,
        currentRound: state.currentRound,
        currentQuestionNumber: state.currentQuestionNumber,
        questionStatus: state.questionStatus,
        timerDuration: state.timerDuration,
        startTime: state.startTime,
        endTime: state.endTime,
        remainingSeconds: remaining,
        isLeaderboardVisibleToTeams: state.isLeaderboardVisibleToTeams,
        completedQuestions: allCompleted
      },
      question: questionData
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error retrieving game state', error: error.message });
  }
};

export const activateRound = async (req, res) => {
  try {
    const { round } = req.body;
    if (![1, 2, 3].includes(Number(round))) {
      return res.status(400).json({ message: 'Round must be 1, 2, or 3' });
    }

    let state = await GameState.findOne({ key: 'LIVE_GAME_STATE' });
    if (!state) state = new GameState({ key: 'LIVE_GAME_STATE' });

    state.status = 'RUNNING';
    state.currentRound = Number(round);
    state.currentQuestionNumber = null;
    state.currentQuestionId = null;
    state.questionStatus = 'IDLE';
    state.startTime = null;
    state.endTime = null;
    await state.save();

    await createAuditLog({
      admin: req.admin?.username || 'ADMIN',
      action: 'ROUND_ACTIVATED',
      module: 'COMPETITION',
      reference: `Round ${round}`,
      newValue: { round: Number(round) },
      req
    });

    return res.status(200).json({ success: true, message: `Round ${round} activated`, state });
  } catch (error) {
    return res.status(500).json({ message: 'Error activating round', error: error.message });
  }
};

export const startQuestion = async (req, res) => {
  try {
    const { questionNumber } = req.body;
    let state = await GameState.findOne({ key: 'LIVE_GAME_STATE' });
    if (!state || !state.currentRound) {
      return res.status(400).json({ message: 'Please activate a round first' });
    }

    // Prevent restarting questions that have already been evaluated and completed
    const alreadyInLedger = await ScoreLedger.exists({
      round: Number(state.currentRound),
      questionNumber: Number(questionNumber),
      isAdjustment: false
    });

    const isAlreadyCompleted = alreadyInLedger || state.completedQuestions?.some(
      cq => Number(cq.round) === Number(state.currentRound) && Number(cq.questionNumber) === Number(questionNumber)
    );
    if (isAlreadyCompleted) {
      return res.status(400).json({
        message: `Round ${state.currentRound} Question ${questionNumber} has already been completed & evaluated. It cannot be started again.`
      });
    }

    const question = await Question.findOne({
      round: state.currentRound,
      questionNumber: Number(questionNumber)
    });

    if (!question) {
      return res.status(404).json({
        message: `Question ${questionNumber} for Round ${state.currentRound} not found in Question Bank. Please add it first.`
      });
    }

    // Fetch duration from question or settings
    const settings = await CompetitionSettings.findOne({ key: 'GLOBAL_SETTINGS' });
    let duration = question.timerSeconds;
    if (!duration) {
      if (state.currentRound === 1) duration = settings?.round1Timer || 30;
      else if (state.currentRound === 2) duration = settings?.round2Timer || 15;
      else if (state.currentRound === 3) duration = settings?.round3Timer || 30;
      else duration = 30;
    }

    const now = new Date();
    const endTime = new Date(now.getTime() + duration * 1000);

    state.currentQuestionNumber = Number(questionNumber);
    state.currentQuestionId = question._id;
    state.questionStatus = 'ACTIVE';
    state.timerDuration = duration;
    state.startTime = now;
    state.endTime = endTime;
    state.remainingSeconds = duration;
    await state.save();

    await createAuditLog({
      admin: req.admin?.username || 'ADMIN',
      action: 'QUESTION_STARTED',
      module: 'COMPETITION',
      reference: `R${state.currentRound}-Q${questionNumber}`,
      newValue: { timerDuration: duration, startTime: now },
      req
    });

    return res.status(200).json({ success: true, message: `Question ${questionNumber} started`, state, question });
  } catch (error) {
    return res.status(500).json({ message: 'Error starting question', error: error.message });
  }
};

export const pauseQuestion = async (req, res) => {
  try {
    let state = await GameState.findOne({ key: 'LIVE_GAME_STATE' }).populate('currentQuestionId');
    if (!state || state.questionStatus !== 'ACTIVE') {
      return res.status(400).json({ message: 'No active question to pause' });
    }

    const now = new Date();
    const remaining = Math.max(0, Math.ceil((new Date(state.endTime) - now) / 1000));

    state.questionStatus = 'PAUSED';
    state.remainingSeconds = remaining;
    await state.save();

    await createAuditLog({
      admin: req.admin?.username || 'ADMIN',
      action: 'QUESTION_PAUSED',
      module: 'COMPETITION',
      reference: `R${state.currentRound}-Q${state.currentQuestionNumber}`,
      req
    });

    return res.status(200).json({ success: true, message: 'Question paused', remainingSeconds: remaining });
  } catch (error) {
    return res.status(500).json({ message: 'Error pausing question', error: error.message });
  }
};

export const resumeQuestion = async (req, res) => {
  try {
    let state = await GameState.findOne({ key: 'LIVE_GAME_STATE' }).populate('currentQuestionId');
    if (!state || state.questionStatus !== 'PAUSED') {
      return res.status(400).json({ message: 'Question is not paused' });
    }

    const now = new Date();
    const duration = state.remainingSeconds || 10;
    const endTime = new Date(now.getTime() + duration * 1000);

    state.questionStatus = 'ACTIVE';
    state.startTime = now;
    state.endTime = endTime;
    await state.save();

    await createAuditLog({
      admin: req.admin?.username || 'ADMIN',
      action: 'QUESTION_RESUMED',
      module: 'COMPETITION',
      reference: `R${state.currentRound}-Q${state.currentQuestionNumber}`,
      req
    });

    return res.status(200).json({ success: true, message: 'Question resumed', endTime });
  } catch (error) {
    return res.status(500).json({ message: 'Error resuming question', error: error.message });
  }
};

export const endQuestion = async (req, res) => {
  try {
    let state = await GameState.findOne({ key: 'LIVE_GAME_STATE' }).populate('currentQuestionId');
    if (!state || !state.currentQuestionId) {
      return res.status(400).json({ message: 'No question is currently selected' });
    }

    state.questionStatus = 'ENDED';
    state.remainingSeconds = 0;
    await state.save();

    await createAuditLog({
      admin: req.admin?.username || 'ADMIN',
      action: 'QUESTION_ENDED',
      module: 'COMPETITION',
      reference: `R${state.currentRound}-Q${state.currentQuestionNumber}`,
      req
    });

    return res.status(200).json({ success: true, message: 'Question submissions locked' });
  } catch (error) {
    return res.status(500).json({ message: 'Error ending question', error: error.message });
  }
};

export const revealAnswer = async (req, res) => {
  try {
    let state = await GameState.findOne({ key: 'LIVE_GAME_STATE' }).populate('currentQuestionId');
    if (!state || !state.currentQuestionId) {
      return res.status(400).json({ message: 'No question available to reveal' });
    }

    const question = state.currentQuestionId;
    state.questionStatus = 'REVEALED';

    // Track completed question so it cannot be restarted
    if (!state.completedQuestions) {
      state.completedQuestions = [];
    }
    const alreadyCompleted = state.completedQuestions.some(
      cq => cq.round === question.round && cq.questionNumber === question.questionNumber
    );
    if (!alreadyCompleted) {
      state.completedQuestions.push({
        round: question.round,
        questionNumber: question.questionNumber,
        questionId: question._id,
        completedAt: new Date()
      });
    }

    await state.save();

    // 1. Fetch all approved participating teams
    const teams = await Team.find({ status: 'approved' });

    // 2. Fetch all responses submitted for this question
    const responses = await Response.find({ questionId: question._id });
    const responseMap = new Map();
    responses.forEach(r => responseMap.set(r.teamId.toString(), r));

    // 3. For Round 1, determine fastest completely correct submission within 15 seconds
    let fastestWinnerTeamId = null;
    if (question.round === 1) {
      let minTime = Infinity;
      responses.forEach(r => {
        const isExact = Array.isArray(r.answerData) &&
          r.answerData.length === question.round1CorrectOrder?.length &&
          r.answerData.every((val, idx) => val === question.round1CorrectOrder[idx]);

        if (isExact && r.submissionTimeSeconds <= 15) {
          if (r.submissionTimeSeconds < minTime) {
            minTime = r.submissionTimeSeconds;
            fastestWinnerTeamId = r.teamId.toString();
          }
        }
      });
    }

    // 4. Evaluate each team idempotently
    const evaluatedResults = [];

    for (const team of teams) {
      const teamIdStr = team._id.toString();
      const existingResponse = responseMap.get(teamIdStr);

      let evaluation = null;
      let submissionTimeSeconds = existingResponse ? existingResponse.submissionTimeSeconds : 0;

      if (question.round === 1) {
        const isFastest = teamIdStr === fastestWinnerTeamId;
        const submitted = existingResponse ? existingResponse.answerData : null;
        evaluation = evaluateRound1(submitted, question.round1CorrectOrder || [], submissionTimeSeconds, isFastest);
      } else if (question.round === 2) {
        const submitted = existingResponse ? existingResponse.answerData : null;
        evaluation = evaluateRound2(submitted, question.round2Defects || []);
      } else if (question.round === 3) {
        const submitted = existingResponse ? existingResponse.answerData : null;
        evaluation = evaluateRound3(submitted, question.round3CorrectOptions || []);
      }

      // Record score ledger entry idempotently
      await ScoreLedger.findOneAndUpdate(
        { teamId: team._id, questionId: question._id, isAdjustment: false },
        {
          teamId: team._id,
          round: question.round,
          questionId: question._id,
          questionNumber: question.questionNumber,
          baseScore: evaluation.basePoints,
          bonusScore: evaluation.bonusPoints,
          penaltyScore: evaluation.penaltyPoints,
          totalScore: evaluation.totalScore,
          reason: evaluation.explanation,
          adminUser: req.admin?.username || 'SYSTEM'
        },
        { upsert: true, new: true }
      );

      // Update response object
      if (existingResponse) {
        existingResponse.isEvaluated = true;
        existingResponse.scoreResult = evaluation;
        await existingResponse.save();
      } else {
        // Record unattempted response
        await Response.create({
          teamId: team._id,
          questionId: question._id,
          round: question.round,
          questionNumber: question.questionNumber,
          answerData: null,
          isTimeout: true,
          isLocked: true,
          isEvaluated: true,
          scoreResult: evaluation
        });
      }

      evaluatedResults.push({
        teamId: team.teamId,
        teamName: team.teamName,
        evaluation
      });
    }

    await createAuditLog({
      admin: req.admin?.username || 'ADMIN',
      action: 'ANSWER_REVEALED',
      module: 'SCORING',
      reference: `R${question.round}-Q${question.questionNumber}`,
      newValue: { evaluatedTeamsCount: teams.length },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Answers evaluated and revealed to all participants',
      question,
      evaluatedResults
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error revealing answer', error: error.message });
  }
};

export const resetCompetition = async (req, res) => {
  try {
    await Response.deleteMany({});
    await ScoreLedger.deleteMany({});

    let state = await GameState.findOne({ key: 'LIVE_GAME_STATE' });
    if (state) {
      state.status = 'NOT_STARTED';
      state.currentRound = null;
      state.currentQuestionNumber = null;
      state.currentQuestionId = null;
      state.questionStatus = 'IDLE';
      state.startTime = null;
      state.endTime = null;
      state.remainingSeconds = 0;
      state.completedQuestions = [];
      await state.save();
    }

    await createAuditLog({
      admin: req.admin?.username || 'ADMIN',
      action: 'COMPETITION_RESET',
      module: 'COMPETITION',
      reference: 'All Responses and Scores cleared',
      req
    });

    return res.status(200).json({ success: true, message: 'Competition has been reset successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error resetting competition', error: error.message });
  }
};
