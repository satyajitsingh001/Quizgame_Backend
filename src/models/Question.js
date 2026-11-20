import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  round: {
    type: Number,
    required: true,
    enum: [1, 2, 3]
  },
  questionNumber: {
    type: Number,
    required: true,
    min: 1
  },
  prompt: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  timerSeconds: {
    type: Number,
    default: function() {
      if (this.round === 1) return 30;
      if (this.round === 2) return 15;
      if (this.round === 3) return 30;
      return 30;
    }
  },
  // Round 1 Specific Fields: Sequence of 4 activities
  round1Activities: [{
    id: { type: String, required: true }, // e.g., 'A', 'B', 'C', 'D'
    text: { type: String, required: true }
  }],
  round1CorrectOrder: [{
    type: String // array of ids in correct sequence, e.g. ['C', 'A', 'D', 'B']
  }],

  // Round 2 Specific Fields: Defect Image & Matching
  round2ImageUrl: {
    type: String,
    default: ''
  },
  round2Defects: [{
    id: { type: String, required: true }, // e.g. '1', '2', '3', '4'
    label: { type: String, required: true }, // e.g. 'Defect Zone #1'
    correctTerm: { type: String, required: true }, // e.g. 'Solder Bridging' or target name like 'Cat'
    imageUrl: { type: String, default: '' } // uploaded image for this zone/name
  }],
  round2TermOptions: [{
    type: String // available terms to choose from
  }],

  // Round 3 Specific Fields: MSQ (Multiple Select)
  round3Options: [{
    id: { type: String, required: true }, // 'A', 'B', 'C', 'D'
    text: { type: String, required: true }
  }],
  round3CorrectOptions: [{
    type: String // e.g. ['A', 'C']
  }],

  // Scoring configuration overrides per question
  pointsConfig: {
    basePoints: { type: Number },
    bonusPoints: { type: Number },
    penaltyPoints: { type: Number },
    unansweredPenalty: { type: Number }
  },

  isReady: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Composite unique index: Round + Question Number
questionSchema.index({ round: 1, questionNumber: 1 }, { unique: true });

// Method to sanitize question for participants (Hides correct answers)
questionSchema.methods.toParticipantJSON = function() {
  const obj = this.toObject();
  delete obj.round1CorrectOrder;
  delete obj.round3CorrectOptions;
  if (obj.round2Defects) {
    obj.round2Defects = obj.round2Defects.map(d => ({
      id: d.id,
      label: d.label,
      correctTerm: d.correctTerm,
      imageUrl: d.imageUrl || ''
    }));
  }
  return obj;
};

export default mongoose.model('Question', questionSchema);
