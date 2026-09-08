const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema(
  {
    personnel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Personnel',
      required: true,
      index: true,
    },
    modelType: {
      type: String,
      enum: ['RISK', 'TREND', 'READINESS', 'FATIGUE'],
      required: true,
      index: true,
    },
    modelVersion: { type: String, required: true, default: '1.0.0' },
    predictedAt: { type: Date, default: Date.now, index: true },
    riskScore: { type: Number, min: 0, max: 1 },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
    },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    // Aggregated, de-identified signal names (safe for commanders).
    topFactors: [{ name: { type: String }, weight: { type: Number } }],
    // SENSITIVE: full model response — surfaced only to counsellors.
    rawOutput: { type: mongoose.Schema.Types.Mixed, default: null },
    recommendationSummary: { type: String, maxlength: 2000, default: '' },
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

predictionSchema.index({ personnel: 1, modelType: 1, predictedAt: -1 });

const Prediction = mongoose.model('Prediction', predictionSchema);

module.exports = Prediction;