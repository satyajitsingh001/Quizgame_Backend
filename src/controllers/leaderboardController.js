import Team from '../models/Team.js';
import ScoreLedger from '../models/ScoreLedger.js';
import Response from '../models/Response.js';
import { createAuditLog } from '../middleware/auth.js';

export const getLeaderboard = async (req, res) => {
  try {
    const teams = await Team.find({ status: 'approved' });
    const teamIds = teams.map(t => t._id);

    // Aggregate score totals per team and per round
    const scoreAgg = await ScoreLedger.aggregate([
      { $match: { teamId: { $in: teamIds } } },
      {
        $group: {
          _id: { teamId: '$teamId', round: '$round' },
          roundTotal: { $sum: '$totalScore' }
        }
      }
    ]);

    // Aggregate cumulative response time for tie-breaking
    const timeAgg = await Response.aggregate([
      { $match: { teamId: { $in: teamIds } } },
      {
        $group: {
          _id: '$teamId',
          totalTime: { $sum: '$submissionTimeSeconds' }
        }
      }
    ]);

    const timeMap = new Map();
    timeAgg.forEach(t => timeMap.set(t._id.toString(), t.totalTime));

    const roundScoreMap = new Map(); // "teamId_round" -> score
    scoreAgg.forEach(s => {
      roundScoreMap.set(`${s._id.teamId.toString()}_${s._id.round}`, s.roundTotal);
    });

    const leaderboard = teams.map(team => {
      const idStr = team._id.toString();
      const r1 = roundScoreMap.get(`${idStr}_1`) || 0;
      const r2 = roundScoreMap.get(`${idStr}_2`) || 0;
      const r3 = roundScoreMap.get(`${idStr}_3`) || 0;
      const totalScore = r1 + r2 + r3;
      const totalTime = timeMap.get(idStr) || 0;

      return {
        teamId: team.teamId,
        teamMongoId: team._id,
        teamName: team.teamName,
        captainName: team.captainName,
        members: team.members.map(m => m.name),
        round1Score: r1,
        round2Score: r2,
        round3Score: r3,
        totalScore,
        totalTimeSeconds: parseFloat(totalTime.toFixed(2))
      };
    });

    // Sort: Total Score descending; Tie-break: total submission time ascending (faster wins)
    leaderboard.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return a.totalTimeSeconds - b.totalTimeSeconds;
    });

    // Assign rank with tie detection
    let currentRank = 1;
    for (let i = 0; i < leaderboard.length; i++) {
      if (i > 0 && leaderboard[i].totalScore === leaderboard[i - 1].totalScore && leaderboard[i].totalTimeSeconds === leaderboard[i - 1].totalTimeSeconds) {
        leaderboard[i].rank = leaderboard[i - 1].rank;
      } else {
        leaderboard[i].rank = currentRank;
      }
      currentRank++;
    }

    return res.status(200).json({ success: true, count: leaderboard.length, leaderboard });
  } catch (error) {
    return res.status(500).json({ message: 'Error calculating leaderboard', error: error.message });
  }
};

export const getRoundLeaderboard = async (req, res) => {
  try {
    const roundNumber = parseInt(req.params.round);
    if (![1, 2, 3].includes(roundNumber)) {
      return res.status(400).json({ message: 'Invalid round number' });
    }

    const teams = await Team.find({ status: 'approved' });
    const teamIds = teams.map(t => t._id);

    const scoreAgg = await ScoreLedger.aggregate([
      { $match: { teamId: { $in: teamIds }, round: roundNumber } },
      {
        $group: {
          _id: '$teamId',
          roundTotal: { $sum: '$totalScore' }
        }
      }
    ]);

    const roundScoreMap = new Map();
    scoreAgg.forEach(s => roundScoreMap.set(s._id.toString(), s.roundTotal));

    const roundLeaderboard = teams.map(team => {
      const idStr = team._id.toString();
      const score = roundScoreMap.get(idStr) || 0;
      return {
        teamId: team.teamId,
        teamMongoId: team._id,
        teamName: team.teamName,
        captainName: team.captainName,
        round: roundNumber,
        score
      };
    });

    roundLeaderboard.sort((a, b) => b.score - a.score);

    roundLeaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    return res.status(200).json({ success: true, round: roundNumber, leaderboard: roundLeaderboard });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching round leaderboard', error: error.message });
  }
};

export const adjustScore = async (req, res) => {
  try {
    const { teamMongoId, round, adjustmentPoints, reason } = req.body;

    if (!teamMongoId || !round || adjustmentPoints === undefined || !reason) {
      return res.status(400).json({ message: 'teamMongoId, round, adjustmentPoints, and reason are required' });
    }

    const team = await Team.findById(teamMongoId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const adjustmentRecord = await ScoreLedger.create({
      teamId: team._id,
      round: Number(round),
      questionId: null,
      questionNumber: null,
      baseScore: Number(adjustmentPoints),
      bonusScore: 0,
      penaltyScore: 0,
      totalScore: Number(adjustmentPoints),
      isAdjustment: true,
      reason: reason.trim(),
      adminUser: req.admin?.username || 'ADMIN'
    });

    await createAuditLog({
      admin: req.admin?.username || 'ADMIN',
      action: 'SCORE_ADJUSTMENT',
      module: 'SCORING',
      reference: `${team.teamId} (Round ${round})`,
      newValue: { points: Number(adjustmentPoints), reason: reason.trim() },
      req
    });

    return res.status(200).json({
      success: true,
      message: `Score adjusted for ${team.teamName} by ${adjustmentPoints} pts.`,
      adjustmentRecord
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error adjusting score', error: error.message });
  }
};

export const getScoreLedger = async (req, res) => {
  try {
    const { teamId, round } = req.query;
    const filter = {};
    if (teamId) filter.teamId = teamId;
    if (round) filter.round = Number(round);

    const ledger = await ScoreLedger.find(filter)
      .populate('teamId', 'teamId teamName captainName')
      .populate('questionId', 'round questionNumber prompt')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: ledger.length, ledger });
  } catch (error) {
    return res.status(500).json({ message: 'Error retrieving score ledger', error: error.message });
  }
};
