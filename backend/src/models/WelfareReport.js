const mongoose = require('mongoose');

const welfareReportSchema = new mongoose.Schema(
  {
    personnel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Personnel',
      required: true,
      index: true,
    },
    counsellor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['INITIAL', 'FOLLOW_UP', 'SESSION', 'CLOSURE'],
      required: true,
    },
    date: { type: Date, default: Date.now, index: true },
    // SENSITIVE: clinical narrative, accessible only to counsellors and the personnel.
    summary: { type: String, maxlength: 5000, default: '' },
    assessmentScore: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    recommendations: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'REVIEWED'],
      default: 'SUBMITTED',
    },
    followUpDate: { type: Date, default: null },
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

welfareReportSchema.index({ personnel: 1, date: -1 });
welfareReportSchema.index({ counsellor: 1, date: -1 });

const WelfareReport = mongoose.model('WelfareReport', welfareReportSchema);

module.exports = WelfareReport;