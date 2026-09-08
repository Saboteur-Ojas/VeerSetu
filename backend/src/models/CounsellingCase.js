const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['PHONE', 'SESSION', 'REVIEW', 'FIELD_VISIT'], default: 'SESSION' },
    notes: { type: String, maxlength: 3000, default: '' },
    moodTrend: { type: String, enum: ['IMPROVING', 'STABLE', 'DETERIORATING', 'UNKNOWN'], default: 'UNKNOWN' },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: true, timestamps: true }
);

const counsellingCaseSchema = new mongoose.Schema(
  {
    caseRef: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
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
    openedAt: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'FOLLOW_UP', 'ESCALATED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'],
      default: 'MEDIUM',
    },
    category: {
      type: String,
      enum: [
        'PTSD',
        'ANXIETY',
        'DEPRESSION',
        'STRESS',
        'FAMILY_ISSUE',
        'FINANCIAL_ISSUE',
        'SUICIDAL_IDEATION',
        'SUBSTANCE_USE',
        'GRIEF',
        'OTHER',
      ],
      required: true,
    },
    // SENSITIVE: clinical narrative — never projected to commanders.
    description: { type: String, maxlength: 5000, default: '' },
    escalation: {
      escalatedTo: { type: String, default: '' },
      escalatedAt: { type: Date, default: null },
      reason: { type: String, maxlength: 2000, default: '' },
    },
    followUps: { type: [followUpSchema], default: [] },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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

counsellingCaseSchema.index({ personnel: 1, status: 1 });
counsellingCaseSchema.index({ counsellor: 1, status: 1 });
counsellingCaseSchema.index({ priority: 1, status: 1 });

const CounsellingCase = mongoose.model('CounsellingCase', counsellingCaseSchema);

module.exports = CounsellingCase;