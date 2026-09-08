const mongoose = require('mongoose');

const dailyRecordSchema = new mongoose.Schema(
  {
    personnel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Personnel',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      set: (v) => {
        const d = new Date(v);
        d.setUTCHours(0, 0, 0, 0);
        return d;
      },
    },
    sleep: {
      hours: { type: Number, min: 0, max: 24, required: true },
      quality: { type: Number, min: 1, max: 10, required: true },
    },
    moodScore: { type: Number, min: 1, max: 10, required: true },
    stressLevel: { type: Number, min: 1, max: 10, required: true },
    fatigueLevel: { type: Number, min: 1, max: 10, required: true },
    physical: {
      exerciseMinutes: { type: Number, min: 0, max: 1440, default: 0 },
      exerciseType: { type: String, trim: true, default: '' },
    },
    nutrition: {
      mealCount: { type: Number, min: 0, max: 10, default: 0 },
      waterIntakeLiters: { type: Number, min: 0, max: 20, default: 0 },
    },
    dutyHours: { type: Number, min: 0, max: 24, default: 0 },
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

// One daily record per personnel per calendar day.
dailyRecordSchema.index({ personnel: 1, date: 1 }, { unique: true });
dailyRecordSchema.index({ personnel: 1, 'flagged.isFlagged': 1 });
dailyRecordSchema.index({ date: 1 });

// Compute the flag on the fly based on clinical thresholds before persisting.
const FLAG_THRESHOLDS = {
  stressLevel: 8,
  fatigueLevel: 8,
  moodScoreLow: 3,
  sleepHoursLow: 4,
  sleepQualityLow: 3,
};

dailyRecordSchema.pre('validate', function computeFlag(next) {
  const reasons = [];

  if (this.stressLevel >= FLAG_THRESHOLDS.stressLevel) {
    reasons.push('STRESS_LEVEL_CRITICAL');
  }
  if (this.fatigueLevel >= FLAG_THRESHOLDS.fatigueLevel) {
    reasons.push('FATIGUE_LEVEL_CRITICAL');
  }
  if (this.moodScore <= FLAG_THRESHOLDS.moodScoreLow) {
    reasons.push('MOOD_SCORE_LOW');
  }
  if (this.sleep && (this.sleep.hours < FLAG_THRESHOLDS.sleepHoursLow || this.sleep.quality <= FLAG_THRESHOLDS.sleepQualityLow)) {
    reasons.push('SLEEP_DEPRIVATION');
  }

  this.flagged = {
    isFlagged: reasons.length > 0,
    reason: reasons.join(','),
  };

  return next();
});

const DailyRecord = mongoose.model('DailyRecord', dailyRecordSchema);

module.exports = DailyRecord;