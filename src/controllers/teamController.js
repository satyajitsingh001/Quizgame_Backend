import Team from '../models/Team.js';
import CompetitionSettings from '../models/CompetitionSettings.js';
import { createAuditLog } from '../middleware/auth.js';

export const registerTeam = async (req, res) => {
  try {
    const { teamName, members, captainName, contactNumber } = req.body;

    // 1. Check settings
    let settings = await CompetitionSettings.findOne({ key: 'GLOBAL_SETTINGS' });
    if (!settings) {
      settings = await CompetitionSettings.create({ key: 'GLOBAL_SETTINGS' });
    }

    if (!settings.isRegistrationOpen) {
      return res.status(403).json({ message: 'Team registration is currently closed by the Admin.' });
    }

    // 2. Validate max teams limit
    const currentTeamCount = await Team.countDocuments();
    if (currentTeamCount >= settings.maxTeams) {
      return res.status(400).json({ message: `Registration capacity reached (${settings.maxTeams} teams maximum).` });
    }

    // 3. Validate team name
    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ message: 'Team name is required.' });
    }

    const existingTeam = await Team.findOne({ 
      teamName: { $regex: new RegExp(`^${teamName.trim()}$`, 'i') } 
    });
    if (existingTeam) {
      return res.status(400).json({ message: 'A team with this name already exists. Please choose another name.' });
    }

    // 4. Validate exactly 5 members
    if (!members || !Array.isArray(members) || members.length !== 5) {
      return res.status(400).json({ message: 'Exactly 5 team members are required.' });
    }

    const trimmedMembers = members.map(m => typeof m === 'string' ? m.trim() : m?.name?.trim()).filter(Boolean);
    if (trimmedMembers.length !== 5) {
      return res.status(400).json({ message: 'All 5 member names must be non-empty.' });
    }

    // 5. Validate captain nomination
    if (!captainName || !captainName.trim()) {
      return res.status(400).json({ message: 'Please nominate one member as Team Captain.' });
    }

    const trimmedCaptain = captainName.trim();
    if (!trimmedMembers.includes(trimmedCaptain)) {
      return res.status(400).json({ message: 'The nominated captain must be one of the 5 registered team members.' });
    }

    // 6. Generate Team ID (PP-01, PP-02, ...)
    const nextNum = currentTeamCount + 1;
    const teamId = `PP-${String(nextNum).padStart(2, '0')}`;

    // 7. Generate random 4-digit PIN
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    // 8. Format member documents
    const formattedMembers = trimmedMembers.map(name => ({
      name,
      isCaptain: name.toLowerCase() === trimmedCaptain.toLowerCase()
    }));

    const status = settings.requireApproval ? 'pending' : 'approved';

    const newTeam = await Team.create({
      teamId,
      teamName: teamName.trim(),
      members: formattedMembers,
      captainName: trimmedCaptain,
      contactNumber: contactNumber ? contactNumber.trim() : '',
      pin,
      status
    });

    await createAuditLog({
      admin: 'SYSTEM',
      action: 'TEAM_REGISTERED',
      module: 'REGISTRATION',
      reference: newTeam.teamId,
      newValue: { teamName: newTeam.teamName, captainName: newTeam.captainName, membersCount: 5 },
      req
    });

    return res.status(201).json({
      success: true,
      message: 'Team registered successfully!',
      team: {
        id: newTeam._id,
        teamId: newTeam.teamId,
        teamName: newTeam.teamName,
        captainName: newTeam.captainName,
        members: newTeam.members,
        pin: newTeam.pin,
        status: newTeam.status
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to register team', error: error.message });
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
    const { teamName, members, captainName, contactNumber, pin, status } = req.body;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const previousValue = {
      teamName: team.teamName,
      captainName: team.captainName,
      status: team.status
    };

    if (teamName) team.teamName = teamName.trim();
    if (contactNumber !== undefined) team.contactNumber = contactNumber.trim();
    if (pin) team.pin = pin.trim();
    if (status) team.status = status;

    if (members && Array.isArray(members) && members.length === 5) {
      const trimmed = members.map(m => typeof m === 'string' ? m.trim() : m.name.trim());
      const captain = captainName ? captainName.trim() : team.captainName;
      team.captainName = captain;
      team.members = trimmed.map(name => ({
        name,
        isCaptain: name.toLowerCase() === captain.toLowerCase()
      }));
    } else if (captainName) {
      team.captainName = captainName.trim();
      team.members.forEach(m => {
        m.isCaptain = (m.name.toLowerCase() === captainName.trim().toLowerCase());
      });
    }

    await team.save();

    await createAuditLog({
      admin: req.admin?.username || 'ADMIN',
      action: 'TEAM_UPDATED',
      module: 'TEAMS',
      reference: team.teamId,
      previousValue,
      newValue: { teamName: team.teamName, captainName: team.captainName, status: team.status },
      req
    });

    return res.status(200).json({ success: true, message: 'Team updated successfully', team });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating team', error: error.message });
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
