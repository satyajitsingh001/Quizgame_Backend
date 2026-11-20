import mongoose from 'mongoose';

const gameStateSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'LIVE_GAME_STATE',
    unique: true
  },
  competitionTitle: {
    type: String,
    default: 'Powering Performance 2026 – The Ultimate Quality Challenge'
  },
  status: {
    type: String,
    enum: ['NOT_STARTED', 'RUNNING', 'PAUSED', 'COMPLETED'],
    default: 'NOT_STARTED'
  },
  currentRound: {
    type: Number,
    enum: [1, 2, 3, null],
    default: null
  },
  currentQuestionNumber: {
    type: Number,
    default: null
  },
  currentQuestionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    default: null
  },
  questionStatus: {
    type: String,
    enum: ['IDLE', 'ACTIVE', 'PAUSED', 'ENDED', 'REVEALED'],
    default: 'IDLE'
  },
  timerDuration: {
    type: Number,
    default: 30
  },
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  remainingSeconds: {
    type: Number,
    default: 0
  },
  isLeaderboardVisibleToTeams: {
    type: Boolean,
    default: true
  },
  completedQuestions: [{
    round: Number,
    questionNumber: Number,
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

export default mongoose.model('GameState', gameStateSchema);
