import XLSX from 'xlsx';
import Team from '../models/Team.js';
import Response from '../models/Response.js';
import ScoreLedger from '../models/ScoreLedger.js';
import Question from '../models/Question.js';

export const exportReport = async (req, res) => {
  try {
    const { type, format } = req.params; // type: 'registration' | 'participants' | 'round1' | 'round2' | 'round3' | 'roundwise' | 'final' | 'adjustments' | 'full'; format: 'csv' | 'xlsx'

    let data = [];
    let sheetName = 'Report';

    if (type === 'registration') {
      sheetName = 'User Registrations';
      const teams = await Team.find().sort({ teamId: 1 });
      data = teams.map(t => ({
        'User ID': t.teamId,
        'User Name': t.teamName,
        'Contact': t.contactNumber || 'N/A',
        'Status': t.status,
        'Registered At': t.createdAt ? t.createdAt.toISOString() : ''
      }));
    } else if (type === 'participants') {
      sheetName = 'Participants';
      const teams = await Team.find().sort({ teamId: 1 });
      teams.forEach(t => {
        data.push({
          'User ID': t.teamId,
          'Participant Name': t.teamName,
          'Contact': t.contactNumber || 'N/A',
          'Status': t.status
        });
      });
    } else if (type === 'round1') {
      sheetName = 'Round 1 Responses';
      const responses = await Response.find({ round: 1 })
        .populate('teamId', 'teamId teamName')
        .populate('questionId', 'questionNumber round1CorrectOrder')
        .sort({ questionNumber: 1, submissionTimeSeconds: 1 });

      data = responses.map(r => ({
        'Question': `Q${r.questionNumber}`,
        'Team ID': r.teamId?.teamId || '',
        'Team Name': r.teamId?.teamName || '',
        'Submitted Sequence': Array.isArray(r.answerData) ? r.answerData.join(' -> ') : 'Timeout',
        'Time (sec)': r.submissionTimeSeconds,
        'Base Points': r.scoreResult?.basePoints || 0,
        'Bonus Points': r.scoreResult?.bonusPoints || 0,
        'Total Score': r.scoreResult?.totalScore || 0,
        'Explanation': r.scoreResult?.explanation || ''
      }));
    } else if (type === 'round2') {
      sheetName = 'Round 2 Responses';
      const responses = await Response.find({ round: 2 })
        .populate('teamId', 'teamId teamName')
        .sort({ questionNumber: 1 });

      data = responses.map(r => ({
        'Question': `Q${r.questionNumber}`,
        'Team ID': r.teamId?.teamId || '',
        'Team Name': r.teamId?.teamName || '',
        'Matches Correct': r.scoreResult?.correctMatchesCount ?? 'N/A',
        'Score': r.scoreResult?.totalScore || 0,
        'Result': r.scoreResult?.explanation || ''
      }));
    } else if (type === 'round3') {
      sheetName = 'Round 3 Responses';
      const responses = await Response.find({ round: 3 })
        .populate('teamId', 'teamId teamName captainName')
        .sort({ questionNumber: 1 });

      data = responses.map(r => ({
        'Question': `Q${r.questionNumber}`,
        'Team ID': r.teamId?.teamId || '',
        'Team Name': r.teamId?.teamName || '',
        'Captain': r.teamId?.captainName || '',
        'Selected Options': Array.isArray(r.answerData) ? r.answerData.join(', ') : 'Unattempted',
        'Score': r.scoreResult?.totalScore || 0,
        'Result': r.scoreResult?.explanation || ''
      }));
    } else if (type === 'roundwise' || type === 'final' || type === 'full') {
      sheetName = 'Final Leaderboard';
      const teams = await Team.find({ status: 'approved' }).sort({ teamId: 1 });
      const teamIds = teams.map(t => t._id);

      const scoreAgg = await ScoreLedger.aggregate([
        { $match: { teamId: { $in: teamIds } } },
        {
          $group: {
            _id: { teamId: '$teamId', round: '$round' },
            roundTotal: { $sum: '$totalScore' }
          }
        }
      ]);

      const roundScoreMap = new Map();
      scoreAgg.forEach(s => {
        roundScoreMap.set(`${s._id.teamId.toString()}_${s._id.round}`, s.roundTotal);
      });

      const rows = teams.map(t => {
        const idStr = t._id.toString();
        const r1 = roundScoreMap.get(`${idStr}_1`) || 0;
        const r2 = roundScoreMap.get(`${idStr}_2`) || 0;
        const r3 = roundScoreMap.get(`${idStr}_3`) || 0;
        const total = r1 + r2 + r3;
        return {
          'Team ID': t.teamId,
          'Team Name': t.teamName,
          'Captain': t.captainName,
          'Round 1 Score': r1,
          'Round 2 Score': r2,
          'Round 3 Score': r3,
          'Total Score': total
        };
      });

      rows.sort((a, b) => b['Total Score'] - a['Total Score']);
      rows.forEach((r, idx) => {
        r['Rank'] = idx + 1;
      });

      data = rows.map(r => ({
        'Rank': r.Rank,
        'Team ID': r['Team ID'],
        'Team Name': r['Team Name'],
        'Captain': r['Captain'],
        'Round 1': r['Round 1 Score'],
        'Round 2': r['Round 2 Score'],
        'Round 3': r['Round 3 Score'],
        'Total Score': r['Total Score']
      }));
    } else if (type === 'adjustments') {
      sheetName = 'Score Adjustments';
      const adjustments = await ScoreLedger.find({ isAdjustment: true })
        .populate('teamId', 'teamId teamName')
        .sort({ createdAt: -1 });

      data = adjustments.map(a => ({
        'Team ID': a.teamId?.teamId || '',
        'Team Name': a.teamId?.teamName || '',
        'Round': `Round ${a.round}`,
        'Adjusted Points': a.totalScore,
        'Reason': a.reason,
        'Admin User': a.adminUser,
        'Date/Time': a.createdAt.toISOString()
      }));
    }

    if (data.length === 0) {
      data = [{ 'Status': 'No records found for this report yet.' }];
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_report.csv"`);
      return res.status(200).send(csv);
    } else {
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_report.xlsx"`);
      return res.status(200).send(buffer);
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error generating report', error: error.message });
  }
};
