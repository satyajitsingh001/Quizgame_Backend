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

  // Round 2 Specific Fields: 4 Zones & 4 Images
  round2ImageUrl: {
    type: String,
    default: ''
  },
  round2Images: [{
    id: { type: String, required: true }, // e.g. 'A', 'B', 'C', 'D'
    imageUrl: { type: String, default: '' }
  }],
  round2Defects: [{
    id: { type: String, required: true }, // e.g. '1', '2', '3', '4'
    label: { type: String, required: true }, // e.g. 'Zone #1'
    correctTerm: { type: String, required: true }, // e.g. 'Cat', 'Car', 'Ball', 'Dog'
    correctImageId: { type: String, default: 'A' }, // 'A', 'B', 'C', 'D'
    imageUrl: { type: String, default: '' } // uploaded image for this zone/name
  }],
  round2InitialOrder: [{
    type: String // image IDs in random scrambled order e.g. ['B', 'D', 'A', 'C']
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

  if (obj.round2Defects && obj.round2Defects.length > 0) {
    const letters = ['A', 'B', 'C', 'D'];

    // Ensure round2Images is always an array of { id, imageUrl } with resolved images
    if (!obj.round2Images || obj.round2Images.length === 0) {
      obj.round2Images = obj.round2Defects.map((d, idx) => ({
        id: letters[idx] || String(idx + 1),
        imageUrl: d.imageUrl || obj.round2ImageUrl || ''
      }));
    } else {
      // Ensure any item with empty imageUrl gets populated from defects or round2ImageUrl
      obj.round2Images = obj.round2Images.map((img, idx) => ({
        id: img.id || letters[idx] || String(idx + 1),
        imageUrl: img.imageUrl || obj.round2Defects[idx]?.imageUrl || obj.round2ImageUrl || ''
      }));
    }

    // Ensure round2InitialOrder is always set for participants
    if (!obj.round2InitialOrder || obj.round2InitialOrder.length !== obj.round2Defects.length) {
      obj.round2InitialOrder = letters.slice(0, obj.round2Defects.length);
    }

    obj.round2Defects = obj.round2Defects.map(d => ({
      id: d.id,
      label: d.label,
      correctTerm: d.correctTerm,
      imageUrl: d.imageUrl || ''
      // hide correctImageId from participant
    }));
  }

  return obj;
};

export default mongoose.model('Question', questionSchema);
