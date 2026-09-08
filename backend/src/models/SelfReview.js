const mongoose = require('mongoose');

const SELF_REVIEW_DIMENSIONS = [
  'MORALE',
  'STRESS',
  'ANXIETY',
  'FATIGUE',
  'SLEEP',
  'NUTRITION',
  'PHYSICAL',
  'SOCIAL_CONNECTION',
  'WORK_SATISFACTION',
  'FINANCIAL_WELLBEING',
  'FAMILY_CONCERN',
  'OVERALL_WELLBEING',
];

const selfReviewSchema = new mongoose.Schema(
  {
    personnel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Personnel',
      required: true,
      index: true,
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    periodType: {
      type: String,
      enum: ['WEEKLY', 'MONTHLY'],
      default: 'WEEKLY',
    },
    responses: [
      {
        dimension: { type: String, enum: SELF_REVIEW_DIMENSIONS, required: true },
        score: { type: Number, min: 1, max: 10, required: true },
        note: { type: String, maxlength: 500, default: '' },
      },
    ],
    overallScore: { type: Number, min: 1, max: 10, default: 5 },
    flagged: {
      isFlagged: { type: Boolean, default: false },
      reason: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

selfReviewSchema.index({ personnel: 1, periodStart: 1, periodType: 1 });

// Derive the overall score (mean across dimensions) and persistence-time flags.
selfReviewSchema.pre('validate', function computeScores(next) {
  if (this.responses && this.responses.length > 0) {
    const sum = this.responses.reduce((acc, r) => acc + r.score, 0);
    this.overallScore = Math.round((sum / this.responses.length) * 10) / 10;
  }

  const criticalDimensions = this.responses.filter((r) => r.score <= 3);
  this.flagged = {
    isFlagged: criticalDimensions.length > 0,
    reason: criticalDimensions.map((r) => r.dimension).join(',') || '',
  };

  return next();
});

const SelfReview = mongoose.model('SelfReview', selfReviewSchema);

module.exports = SelfReview;
module.exports.SELF_REVIEW_DIMENSIONS = SELF_REVIEW_DIMENSIONS;