import CompetitionSettings from '../models/CompetitionSettings.js';
import GameState from '../models/GameState.js';
import Question from '../models/Question.js';
import { createAuditLog } from '../middleware/auth.js';

export const getSettings = async (req, res) => {
  try {
    let settings = await CompetitionSettings.findOne({ key: 'GLOBAL_SETTINGS' });
    if (!settings) {
      settings = await CompetitionSettings.create({ key: 'GLOBAL_SETTINGS' });
    }
    return res.status(200).json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ message: 'Error retrieving settings', error: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    let settings = await CompetitionSettings.findOne({ key: 'GLOBAL_SETTINGS' });
    if (!settings) {
      settings = new CompetitionSettings({ key: 'GLOBAL_SETTINGS' });
    }

    const previousValue = settings.toObject();
    Object.assign(settings, req.body);
    await settings.save();

    // Synchronize round timers with questions in question bank
    if (req.body.round1Timer) {
      await Question.updateMany({ round: 1 }, { timerSeconds: Number(req.body.round1Timer) });
    }
    if (req.body.round2Timer) {
      await Question.updateMany({ round: 2 }, { timerSeconds: Number(req.body.round2Timer) });
    }
    if (req.body.round3Timer) {
      await Question.updateMany({ round: 3 }, { timerSeconds: Number(req.body.round3Timer) });
    }

    // Also sync title and leaderboard visibility with live GameState
    let gameState = await GameState.findOne({ key: 'LIVE_GAME_STATE' });
    if (gameState) {
      if (req.body.competitionTitle) gameState.competitionTitle = req.body.competitionTitle;
      if (req.body.isLeaderboardVisibleToTeams !== undefined) {
        gameState.isLeaderboardVisibleToTeams = req.body.isLeaderboardVisibleToTeams;
      }
      await gameState.save();
    }

    await createAuditLog({
      admin: req.admin?.username || 'ADMIN',
      action: 'SETTINGS_UPDATED',
      module: 'SETTINGS',
      reference: 'Global Settings',
      previousValue,
      newValue: req.body,
      req
    });

    return res.status(200).json({ success: true, message: 'Settings updated successfully', settings });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating settings', error: error.message });
  }
};
