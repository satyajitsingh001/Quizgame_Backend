import Team from '../models/Team.js';
import CompetitionSettings from '../models/CompetitionSettings.js';
import { createAuditLog } from '../middleware/auth.js';
import Response from '../models/Response.js';
import ScoreLedger from '../models/ScoreLedger.js';

export const registerTeam = async (req, res) => {
  try {
    const rawName = req.body.name || req.body.userName || req.body.teamName;
    const { contactNumber } = req.body;

    // 1. Check settings
    let settings = await CompetitionSettings.findOne({ key: 'GLOBAL_SETTINGS' });
    if (!settings) {
      settings = await CompetitionSettings.create({ key: 'GLOBAL_SETTINGS' });
    }

    if (!settings.isRegistrationOpen) {
      return res.status(403).json({ message: 'Registration is currently closed by the Admin.' });
    }

    // 2. Count current participants for ID generation
    const currentTeamCount = await Team.countDocuments();

    // 3. Validate name
    const registeredName = (rawName || '').trim();
    if (!registeredName) {
      return res.status(400).json({ message: 'Participant / User Name is required.' });
    }

    const existingTeam = await Team.findOne({ 
      teamName: { $regex: new RegExp(`^${registeredName}$`, 'i') } 
    });
    if (existingTeam) {
      return res.status(400).json({ message: 'A participant with this name is already registered. Please choose another name.' });
    }

    // 4. Generate Unique User ID (PP-01, PP-02, ...)
    let counter = currentTeamCount + 1;
    let teamId = `PP-${String(counter).padStart(2, '0')}`;
    while (await Team.exists({ teamId })) {
      counter++;
      teamId = `PP-${String(counter).padStart(2, '0')}`;
    }

    // 5. Generate random 4-digit PIN
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const status = settings.requireApproval ? 'pending' : 'approved';

    const newTeam = await Team.create({
      teamId,
      teamName: registeredName,
      contactNumber: contactNumber ? contactNumber.trim() : '',
      pin,
      status
    });

    await createAuditLog({
      admin: 'SYSTEM',
      action: 'TEAM_REGISTERED',
      module: 'REGISTRATION',
      reference: newTeam.teamId,
      newValue: { teamName: newTeam.teamName, teamId: newTeam.teamId },
      req
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Save your login credentials.',
      team: {
        id: newTeam._id,
        teamId: newTeam.teamId,
        teamName: newTeam.teamName,
        pin: newTeam.pin,
        status: newTeam.status
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to register', error: error.message });
  }
};

export const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find().sort({ createdAt: 1 });
    return res.status(200).json({ success: true, count: teams.length, teams });
  } catch (error) {
    return res.status(500).json({ message: 'Error retrieving teams', error: error.message });
  }
};

export const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { teamName, contactNumber, pin, status } = req.body;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'User not found' });
    }

    const previousValue = {
      teamName: team.teamName,
      status: team.status
    };

    if (teamName) team.teamName = teamName.trim();
    if (contactNumber !== undefined) team.contactNumber = contactNumber.trim();
    if (pin) team.pin = pin.trim();
    if (status) team.status = status;

    await team.save();

    await createAuditLog({
      admin: req.admin?.username || 'ADMIN',
      action: 'USER_UPDATED',
      module: 'USERS',
      reference: team.teamId,
      previousValue,
      newValue: { teamName: team.teamName, status: team.status },
      req
    });

    return res.status(200).json({ success: true, message: 'User updated successfully', team });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

export const approveRejectTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' | 'rejected'

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved, rejected or pending' });
    }

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const oldStatus = team.status;
    team.status = status;
    await team.save();

    await createAuditLog({
      admin: req.admin?.username || 'ADMIN',
      action: `TEAM_${status.toUpperCase()}`,
      module: 'TEAMS',
      reference: team.teamId,
      previousValue: { status: oldStatus },
      newValue: { status },
      req
    });

    return res.status(200).json({ success: true, message: `Team status updated to ${status}`, team });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating team status', error: error.message });
  }
};

export const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    await Team.findByIdAndDelete(id);

    // Also clean up responses and scores associated with this deleted team
    await Response.deleteMany({ teamId: team._id });
    await ScoreLedger.deleteMany({ teamId: team._id });

    await createAuditLog({
      admin: req.admin?.username || 'ADMIN',
      action: 'TEAM_DELETED',
      module: 'TEAMS',
      reference: team.teamId,
      previousValue: { teamName: team.teamName, teamId: team.teamId },
      req
    });

    return res.status(200).json({ success: true, message: 'Team removed successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting team', error: error.message });
  }
};
