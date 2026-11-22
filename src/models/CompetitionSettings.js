import mongoose from 'mongoose';

const competitionSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'GLOBAL_SETTINGS',
    unique: true
  },
  competitionTitle: {
    type: String,
    default: 'Powering Performance 2026 – The Ultimate Quality Challenge'
  },
  subTitle: {
    type: String,
    default: 'Think Fast. Identify Defects. Win the Challenge.'
  },
  isRegistrationOpen: {
    type: Boolean,
    default: true
  },
  requireApproval: {
    type: Boolean,
    default: false
  },
  isContactRequired: {
    type: Boolean,
    default: false
  },
  // Round 1 Rules
  round1Timer: { type: Number, default: 60 },
  round1Points: { type: Number, default: 2.0 },
  round1Bonus: { type: Number, default: 0 },
  round1BonusThresholdSeconds: { type: Number, default: 60 },
  round1BonusOnlyFastest: { type: Boolean, default: false },

  // Round 2 Rules
  round2Timer: { type: Number, default: 45 },
  round2AllCorrectPoints: { type: Number, default: 2 },
  round2PartialPoints: { type: Number, default: 0 },
  round2PenaltyPoints: { type: Number, default: 0 },

  // Round 3 Rules
  round3Timer: { type: Number, default: 30 },
  round3CorrectPoints: { type: Number, default: 2 },
  round3WrongPenalty: { type: Number, default: 0 },
  round3UnattemptedPenalty: { type: Number, default: 0 },

  // UI & Visibility
  isLeaderboardVisibleToTeams: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('CompetitionSettings', competitionSettingsSchema);
