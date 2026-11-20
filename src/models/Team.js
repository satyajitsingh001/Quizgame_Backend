import mongoose from 'mongoose';

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
  }
}, {
  timestamps: true
});

export default mongoose.model('Team', teamSchema);
