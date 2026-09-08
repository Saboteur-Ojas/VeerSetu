const mongoose = require('mongoose');

const behaviouralDataSchema = new mongoose.Schema(
  {
    personnel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Personnel',
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['SYSTEM', 'OBSERVATION', 'PEER', 'SUPERIOR', 'COUNSELLOR'],
      required: true,
    },
    observedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    timestamp: { type: Date, default: Date.now, index: true },
    category: {
      type: String,
      enum: [
        'MORALE',
        'SOCIAL_WITHDRAWAL',
        'IRRITABILITY',
        'ANGER',
        'EATING_CHANGE',
        'SLEEP_CHANGE',
        'SUBSTANCE_USE',
        'DISENGAGEMENT',
        'PERFORMANCE_DROP',
        'SELF_HARM_SIGNAL',
        'OTHER',
      ],
      required: true,
      index: true,
    },
    severity: {
      type: Number,
      min: 1,
      max: 10,
      required: true,
    },
    // SENSITIVE: free-text clinical observation visible ONLY to counsellors.
    notes: { type: String, maxlength: 2000, default: '' },
    flags: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
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

behaviouralDataSchema.index({ personnel: 1, category: 1, timestamp: -1 });
behaviouralDataSchema.index({ personnel: 1, severity: -1 });

// Sanitize free-text notes on save; strip control characters and trim.
behaviouralDataSchema.pre('save', function sanitize(next) {
  if (typeof this.notes === 'string') {
    this.notes = this.notes.replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
  }
  next();
});

const BehaviouralData = mongoose.model('BehaviouralData', behaviouralDataSchema);

module.exports = BehaviouralData;