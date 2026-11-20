import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  admin: {
    type: String,
    required: true,
    default: 'SYSTEM'
  },
  action: {
    type: String,
    required: true
  },
  module: {
    type: String,
    required: true,
    enum: ['AUTH', 'REGISTRATION', 'TEAMS', 'QUESTIONS', 'COMPETITION', 'SCORING', 'SETTINGS']
  },
  reference: {
    type: String,
    default: ''
  },
  previousValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  ipAddress: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export default mongoose.model('AuditLog', auditLogSchema);
