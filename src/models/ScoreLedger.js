import mongoose from 'mongoose';

const scoreLedgerSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  round: {
    type: Number,
    required: true,
    enum: [1, 2, 3]
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    default: null
  },
  questionNumber: {
    type: Number,
    default: null
  },
  baseScore: {
    type: Number,
    default: 0
  },
  bonusScore: {
    type: Number,
    default: 0
  },
  penaltyScore: {
    type: Number,
    default: 0
  },
  totalScore: {
    type: Number,
    required: true
  },
  isAdjustment: {
    type: Boolean,
    default: false
  },
  previousScore: {
    type: Number,
    default: null
  },
  reason: {
    type: String,
    default: 'Automated Evaluation'
  },
  adminUser: {
    type: String,
    default: 'SYSTEM'
  }
}, {
  timestamps: true
});

// Avoid duplicate automated score ledger entries for the same question
scoreLedgerSchema.index({ teamId: 1, questionId: 1, isAdjustment: 1 });

export default mongoose.model('ScoreLedger', scoreLedgerSchema);
