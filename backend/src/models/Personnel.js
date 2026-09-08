const mongoose = require('mongoose');

const postingHistorySchema = new mongoose.Schema(
  {
    unit: { type: String, required: true },
    location: { type: String, required: true },
    from: { type: Date, required: true },
    to: { type: Date, default: null },
  },
  { _id: false }
);

const personnelSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    serviceNumber: {
      type: String,
      required: [true, 'Service number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [128, 'Name cannot exceed 128 characters'],
    },
    rank: {
      type: String,
      required: [true, 'Rank is required'],
      trim: true,
      index: true,
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
      index: true,
    },
    subUnit: { type: String, trim: true, default: '' },
    trade: { type: String, trim: true, default: '' },
    dateOfBirth: { type: Date, required: [true, 'Date of birth is required'] },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], default: 'OTHER' },
    maritalStatus: {
      type: String,
      enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'],
      default: 'SINGLE',
    },
    dependents: { type: Number, default: 0, min: 0, max: 20 },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
      default: '',
    },
    contactPhone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9]{10,15}$/, 'Invalid phone number'],
      default: '',
    },
    dateOfEnrollment: { type: Date, required: [true, 'Date of enrollment is required'] },
    operationalStatus: {
      type: String,
      enum: ['ACTIVE', 'DEPLOYED', 'ON_LEAVE', 'SICK', 'RESTRICTED', 'INACTIVE'],
      default: 'ACTIVE',
    },
    deploymentInfo: {
      currentLocation: { type: String, default: '' },
      deployedSince: { type: Date, default: null },
      deploymentType: { type: String, default: '' },
    },
    postingHistory: { type: [postingHistorySchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
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

personnelSchema.index({ serviceNumber: 1 }, { unique: true });
personnelSchema.index({ unit: 1, operationalStatus: 1 });
personnelSchema.index({ rank: 1 });

// Normalize display fields before persisting.
personnelSchema.pre('save', function normalize(next) {
  if (this.isModified('serviceNumber')) this.serviceNumber = this.serviceNumber.trim().toUpperCase();
  if (this.isModified('name')) this.name = this.name.trim();
  next();
});

// Public ops projection — strictly excludes personal/sensitive fields.
personnelSchema.statics.OPERATIONAL_PROJECTION = {
  name: 1,
  rank: 1,
  unit: 1,
  subUnit: 1,
  trade: 1,
  operationalStatus: 1,
  deploymentInfo: 1,
  dateOfEnrollment: 1,
};

// Counsellor projection — includes the additional context a counsellor needs.
personnelSchema.statics.COUNSELLOR_PROJECTION = {
  name: 1,
  rank: 1,
  unit: 1,
  subUnit: 1,
  trade: 1,
  gender: 1,
  maritalStatus: 1,
  dependents: 1,
  dateOfEnrollment: 1,
  operationalStatus: 1,
  deploymentInfo: 1,
};

const Personnel = mongoose.model('Personnel', personnelSchema);

module.exports = Personnel;