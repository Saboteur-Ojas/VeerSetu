const mongoose = require('mongoose');

const weeklyReportSchema = new mongoose.Schema(
  {
    unit: { type: String, required: true, index: true },
    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    generatedAt: { type: Date, default: Date.now },
    // Aggregated operational metrics — no raw clinical notes.
    summary: {
      personnelCount: { type: Number, default: 0 },
      averageReadinessScore: { type: Number, min: 0, max: 100, default: 0 },
      averageRiskScore: { type: Number, min: 0, max: 1, default: 0 },
      flaggedPersonnelCount: { type: Number, default: 0 },
      activeCasesCount: { type: Number, default: 0 },
      highRiskCount: { type: Number, default: 0 },
      trendDirection: {
        type: String,
        enum: ['IMPROVING', 'STABLE', 'DETERIORATING', 'UNKNOWN'],
        default: 'UNKNOWN',
      },
    },
    // De-identified references only — resolves to names on read in a privacy-filtered way.
    flaggedPersonnel: [
      {
        personnel: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel' },
        riskLevel: { type: String, enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] },
        primaryFactor: { type: String, default: '' },
      },
    ],
    healthTrends: { type: Map, of: Number, default: {} },
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

weeklyReportSchema.index({ unit: 1, periodStart: -1 });

const WeeklyReport = mongoose.model('WeeklyReport', weeklyReportSchema);

module.exports = WeeklyReport;