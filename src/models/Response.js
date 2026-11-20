import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  round: {
    type: Number,
    required: true,
    enum: [1, 2, 3]
  },
  questionNumber: {
    type: Number,
    required: true
  },
  answerData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  submissionTimeSeconds: {
    type: Number,
    default: 0
  },
  isTimeout: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: true
  },
  isEvaluated: {
    type: Boolean,
    default: false
  },
  scoreResult: {
    isCorrect: { type: Boolean, default: false },
    correctMatchesCount: { type: Number, default: 0 },
    basePoints: { type: Number, default: 0 },
    bonusPoints: { type: Number, default: 0 },
    penaltyPoints: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    explanation: { type: String, default: '' }
  }
}, {
  timestamps: true
});

// A team can have only one submission per question
responseSchema.index({ teamId: 1, questionId: 1 }, { unique: true });

export default mongoose.model('Response', responseSchema);
