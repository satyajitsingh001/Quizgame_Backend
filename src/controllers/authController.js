import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Team from '../models/Team.js';
import { createAuditLog } from '../middleware/auth.js';

export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: 'ADMIN' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' }
    );

    await createAuditLog({
      admin: admin.username,
      action: 'ADMIN_LOGIN',
      module: 'AUTH',
      reference: admin.username,
      req
    });

    return res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

export const teamLogin = async (req, res) => {
  try {
    const { teamId, pin } = req.body;
    if (!teamId || !pin) {
      return res.status(400).json({ message: 'Team ID and PIN are required' });
    }

    const team = await Team.findOne({ teamId: teamId.toUpperCase().trim() });
    if (!team) {
      return res.status(401).json({ message: 'Team ID not found' });
    }

    if (team.pin !== pin.trim()) {
      return res.status(401).json({ message: 'Incorrect PIN' });
    }

    if (team.status === 'rejected') {
      return res.status(403).json({ message: 'Your registration was rejected by Admin' });
    }

    const token = jwt.sign(
      { id: team._id, teamId: team.teamId, teamName: team.teamName, role: 'TEAM' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      success: true,
      token,
      team: {
        id: team._id,
        teamId: team.teamId,
        teamName: team.teamName,
        status: team.status
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during team login', error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    if (decoded.role === 'ADMIN') {
      let admin = null;
      if (decoded.id) {
        admin = await Admin.findById(decoded.id).select('-password');
      }
      if (!admin && decoded.username) {
        admin = await Admin.findOne({ username: decoded.username.toLowerCase() }).select('-password');
      }
      if (!admin) {
        admin = await Admin.findOne({}).select('-password');
      }
      if (!admin) {
        return res.status(404).json({ message: 'Admin account not found' });
      }
      return res.status(200).json({ role: 'ADMIN', user: admin });
    } else if (decoded.role === 'TEAM') {
      let team = null;
      if (decoded.id) {
        team = await Team.findById(decoded.id);
      }
      if (!team && decoded.teamId) {
        team = await Team.findOne({ teamId: decoded.teamId.toUpperCase() });
      }
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      return res.status(200).json({ role: 'TEAM', team });
    }

    return res.status(400).json({ message: 'Unknown role' });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token', error: error.message });
  }
};
