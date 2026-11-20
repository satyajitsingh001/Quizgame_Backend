import Response from '../models/Response.js';
import GameState from '../models/GameState.js';
import Team from '../models/Team.js';
import ScoreLedger from '../models/ScoreLedger.js';

export const submitAnswer = async (req, res) => {
  try {
    const { questionId, answerData } = req.body;
    const team = req.team;

    if (!team) {
      return res.status(401).json({ message: 'Team authentication required' });
    }

    // 1. Authoritative check on game state
    const state = await GameState.findOne({ key: 'LIVE_GAME_STATE' });
    if (!state || state.questionStatus !== 'ACTIVE') {
      return res.status(400).json({ message: 'Submissions are currently locked or question is not active.' });
    }

    if (state.currentQuestionId.toString() !== questionId) {
      return res.status(400).json({ message: 'Submission does not match the currently active question.' });
    }

    // 2. Check server deadline
    const now = new Date();
    // Allow small network tolerance
    if (state.endTime && now.getTime() > new Date(state.endTime).getTime() + 1000) {
      return res.status(400).json({ message: 'Time limit expired. Submission closed.' });
    }

    // 3. Prevent duplicate submission
    const existing = await Response.findOne({ teamId: team._id, questionId });
    if (existing) {
      return res.status(400).json({ message: 'Your team has already submitted an answer for this question. Answers are locked.' });
    }

    // 4. Calculate elapsed time in seconds with millisecond precision
    const elapsedMs = Math.max(0, now.getTime() - new Date(state.startTime).getTime());
    const submissionTimeSeconds = parseFloat((elapsedMs / 1000).toFixed(2));

    await Response.create({
      teamId: team._id,
      questionId,
      round: state.currentRound,
      questionNumber: state.currentQuestionNumber,
      answerData,
      submittedAt: now,
      submissionTimeSeconds,
      isTimeout: false,
      isLocked: true
    });

    return res.status(201).json({
      success: true,
      message: 'Answer successfully submitted and locked!',
      submissionTimeSeconds,
      submittedAt: now
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate submission rejected: already submitted.' });
    }
    return res.status(500).json({ message: 'Error submitting answer', error: error.message });
  }
};

export const getQuestionSubmissions = async (req, res) => {
  try {
    const { questionId } = req.params;
    const submissions = await Response.find({ questionId })
      .populate('teamId', 'teamId teamName captainName')
      .sort({ submissionTimeSeconds: 1 });

    const totalApprovedTeams = await Team.countDocuments({ status: 'approved' });

    // Aggregate total cumulative scores per team
    const teamScoreAgg = await ScoreLedger.aggregate([
      {
        $group: {
          _id: '$teamId',
          totalScore: { $sum: '$totalScore' }
        }
      }
    ]);

    const teamScoresMap = {};
    teamScoreAgg.forEach(t => {
      teamScoresMap[t._id.toString()] = t.totalScore;
    });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      totalApprovedTeams,
      submissions,
      teamScoresMap
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching submissions', error: error.message });
  }
};

export const getTeamSubmissionForCurrentQuestion = async (req, res) => {
  try {
    const team = req.team;
    if (!team) {
      return res.status(401).json({ message: 'Team authentication required' });
    }

    const state = await GameState.findOne({ key: 'LIVE_GAME_STATE' });

    // Calculate total score secured by this team across all rounds
    // 1. Check ScoreLedger matching teamId as ObjectId, string, or teamId code
    const ledgerEntries = await ScoreLedger.find({
      $or: [
        { teamId: team._id },
        { teamId: team._id?.toString() },
        { teamId: team.teamId }
      ]
    });

    let round1Score = 0;
    let round2Score = 0;
    let round3Score = 0;
    for (const entry of ledgerEntries) {
      const score = Number(entry.totalScore) || 0;
      if (entry.round === 1) round1Score += score;
      else if (entry.round === 2) round2Score += score;
      else if (entry.round === 3) round3Score += score;
    }

    // 2. Fallback: if ScoreLedger had no entries, check evaluated Response records
    if (ledgerEntries.length === 0) {
      const responses = await Response.find({
        $or: [
          { teamId: team._id },
          { teamId: team._id?.toString() }
        ],
        isEvaluated: true
      });
      for (const resp of responses) {
        const score = Number(resp.scoreResult?.totalScore) || 0;
        if (resp.round === 1) round1Score += score;
        else if (resp.round === 2) round2Score += score;
        else if (resp.round === 3) round3Score += score;
      }
    }

    const totalScore = round1Score + round2Score + round3Score;

    const teamScores = {
      totalScore,
      round1Score,
      round2Score,
      round3Score
    };

    if (!state || !state.currentQuestionId) {
      return res.status(200).json({ submitted: false, response: null, teamScores });
    }

    const response = await Response.findOne({
      teamId: team._id,
      questionId: state.currentQuestionId
    });

    const actuallySubmitted = Boolean(response && response.answerData !== null && !response.isTimeout);

    return res.status(200).json({
      submitted: actuallySubmitted,
      response,
      teamScores
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error checking submission status', error: error.message });
  }
};
