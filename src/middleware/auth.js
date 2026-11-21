import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Team from '../models/Team.js';
import AuditLog from '../models/AuditLog.js';

export const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Admin authentication token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin access only' });
    }

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
      return res.status(401).json({ message: 'Admin account not found' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token', error: error.message });
  }
};

export const teamAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Team session token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    if (decoded.role !== 'TEAM') {
      return res.status(403).json({ message: 'Forbidden: Team access only' });
    }

    let team = null;
    if (decoded.id) {
      team = await Team.findById(decoded.id);
    }
    if (!team && decoded.teamId) {
      team = await Team.findOne({ teamId: decoded.teamId.toUpperCase() });
    }
    if (!team) {
      return res.status(401).json({ message: 'Team not found', teamDeleted: true });
    }

    if (team.status === 'rejected') {
      return res.status(403).json({ message: 'Team registration is rejected', teamDeleted: true });
    }

    req.team = team;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired team session', error: error.message });
  }
};

export const createAuditLog = async ({ admin, action, module, reference = '', previousValue = null, newValue = null, req = null }) => {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '') : '';
    await AuditLog.create({
      admin: admin || 'SYSTEM',
      action,
      module,
      reference,
      previousValue,
      newValue,
      ipAddress
    });
  } catch (err) {
    console.error('[AuditLog Error]:', err.message);
  }
};
