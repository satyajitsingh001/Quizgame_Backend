import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  isCaptain: {
    type: Boolean,
    default: false
  }
});

const teamSchema = new mongoose.Schema({
  teamId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  teamName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  members: {
    type: [memberSchema],
    validate: {
      validator: function(members) {
        return members && members.length === 5;
      },
      message: 'Each team must have exactly 5 members.'
    }
  },
  captainName: {
    type: String,
    required: true,
    trim: true
  },
  contactNumber: {
    type: String,
    trim: true,
    default: ''
  },
  pin: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved'
  },
  sessionToken: {
    type: String,
    default: null
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

export default mongoose.model('Team', teamSchema);
