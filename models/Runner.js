const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { GENDER, ROLE, FLEET, EDUCATION, SERVICE_TYPE, RUNNER_STATUS, VERIFICATION_STATUS } = require('../config/constants');
const { getMatchingConfig } = require('../services/distanceConfigService');

const runnerSchema = new mongoose.Schema({

  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true
  },
  password: {
    type: String,
    select: false
  },
  refreshToken: {
    type: String,
    default: null
  },
  pin: {
    type: String,
    select: false,
  },
  firstName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
    sparse: true,
  },
  buidingName: {
    type: String,
    trim: true,
  },
  flatNumber: {
    type: String,
    trim: true,
  },
  nearestBusStop: {
    type: String,
    trim: true,
  },

  fleetType: {
    type: String,
    enum: FLEET,
    default: 'pedestrian'
  },
  serviceType: {
    type: String,
    default: null
  },
  levelOfEducation: {
    type: String,
    enum: EDUCATION,
    default: 'graduate'
  },
  nameOfInstitution: {
    type: String,
    trim: true,
  },

  // Profile Information
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    default: ''
  },
  dateOfBirth: {
    type: Date,
  },
  gender: {
    type: String,
    enum: {
      values: GENDER,
      message: 'Gender is either male, or female'
    },
    default: 'male'
  },

  dailyErrandCount: {
    type: Number,
    default: 0
  },
  lastErrandResetDate: {
    type: Date,
    default: null
  },

  // Location & Availability
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  fcmToken: {
    type: String,
    default: null,
  },
  currentUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // references the User model
    default: null,
  },
  _totalEarnings: { type: Number, default: 0, min: 0 },
  completedOrders: {
    type: Number,
    default: 0
  },
  orderHistory: [{
    orderId: String,
    userId: mongoose.Schema.Types.ObjectId,
    serviceType: String,
    completedAt: Date,
    earnings: Number
  }],
  activeOrderId: {
    type: String,
    default: null,
    index: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  lastLocationUpdate: {
    type: Date,
    default: null
  },

  termsAccepted: {
    version: String,
    acceptedAt: Date,
    ipAddress: String
  },

  // Verification
  kycStatus: {
    type: String,
    enum: RUNNER_STATUS,
    default: 'pending_verification'
  },
  verificationDocuments: {
    nin: {
      number: String,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      verificationId: String,
      status: { type: String, enum: VERIFICATION_STATUS, default: 'not_submitted' },
      submittedAt: Date,
      documentPath: String,
      verificationData: mongoose.Schema.Types.Mixed,
      rejectedAt: Date,
      rejectionReason: String,
      verifiedBy: String
    },
    driverLicense: {
      number: String,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      expiryDate: Date,
      status: { type: String, enum: VERIFICATION_STATUS, default: 'not_submitted' },
      submittedAt: Date,
      documentPath: String,
      verificationData: mongoose.Schema.Types.Mixed,
      rejectedAt: Date,
      rejectionReason: String,
      verifiedBy: String
    }
  },
  biometricVerification: {
    selfieVerified: { type: Boolean, default: false },
    selfieVerifiedAt: Date,
    selfieImage: String,
    livenessPassed: { type: Boolean, default: false },
    faceMatchScore: Number,
    provider: String,
    verificationId: String,
    status: { type: String, enum: VERIFICATION_STATUS, default: 'not_submitted' },
    submittedAt: Date,
    documentPath: String,
    verificationData: mongoose.Schema.Types.Mixed,
    rejectedAt: Date,
    rejectionReason: String,
    verifiedBy: String
  },

  itemRejectionCount: {
    type: Number,
    default: 0,
  },

  deliveryDenialCount: {
    type: Number,
    default: 0
  },

  // Account Status
  role: {
    type: String,
    enum: ROLE,
    default: 'runner'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },

  isVerifiedKyc: {
    type: Boolean,
    default: false
  },

  isPhoneVerified: {
    type: Boolean,
    default: false
  },

  isEmailVerified: {
    type: Boolean,
    default: false
  },

  // Verification Tokens (same as user)
  verificationToken: String,
  verificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  phoneVerificationOTP: String,
  phoneVerificationExpires: Date,
  emailVerificationOTP: { type: String },
  emailVerificationExpires: { type: Date },

  // Privacy Settings
  isEmailPublic: {
    type: Boolean,
    default: false
  },
  isPhonePublic: {
    type: Boolean,
    default: false
  },

  // Notification Preferences
  notificationPreferences: {
    email: {
      marketing: { type: Boolean, default: true },
      security: { type: Boolean, default: true },
      updates: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: true }
    },
    push: {
      messages: { type: Boolean, default: true },
      updates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false }
    },
    sms: {
      security: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false }
    }
  },

  previousStatus: {
    type: String,
    default: null,
  },

  // Address Information
  address: {
    type: String, maxlength: 255
  },

  // Activity Tracking
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,

  // Account Statistics
  profileViews: {
    type: Number,
    default: 0
  },

  rating: {
    type: Number,
    default: 0
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  // completedOrders already exists, totalRuns is just an alias — add this:
  totalRuns: {
    type: Number,
    default: 0
  },

  lastActive: {
    type: Date,
    default: Date.now
  },

  savedLocations: [{
    name: { type: String, required: true },
    address: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    savedAt: { type: Date, default: Date.now }
  }],

  currentRequest: {
    serviceType: { type: String, default: null },
    fleetType: { type: String, enum: FLEET },
    // common
    deliveryLocation: { type: String },
    dropoffPhone: { type: String },
    specialInstructions: { type: mongoose.Schema.Types.Mixed, default: null },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['idle', 'searching', 'active', 'awaiting_runner_connection', 'completed', 'cancelled'],
      default: 'awaiting_runner_connection'
    },

    // ERAND-SPECIFIC FIELDS
    marketLocation: { type: String },
    marketItems: { type: String },
    budget: { type: Number },
    budgetFlexibility: { type: String, enum: ['stay within budget', 'can adjust slightly'] },
    marketCoordinates: {
      lat: { type: Number },
      lng: { type: Number }
    },

    // PICKUP-SPECIFIC FIELDS
    pickupLocation: { type: String },
    pickupItems: { type: String },
    pickupPhone: { type: String },
    pickupCoordinates: {
      lat: { type: Number },
      lng: { type: Number }
    },
  }

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret.password;
      delete ret.verificationToken;
      delete ret.verificationExpires;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.phoneVerificationOTP;
      delete ret.phoneVerificationExpires;
      delete ret.emailVerificationOTP;
      delete ret.emailVerificationExpires;
      delete ret.failedLoginAttempts;
      delete ret.lockUntil;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret.password;
      delete ret.verificationToken;
      delete ret.verificationExpires;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.phoneVerificationOTP;
      delete ret.phoneVerificationExpires;
      delete ret.emailVerificationOTP;
      delete ret.emailVerificationExpires;
      delete ret.failedLoginAttempts;
      delete ret.lockUntil;
      return ret;
    }
  }
});

// Virtuals
runnerSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

runnerSchema.virtual('accountAge').get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

runnerSchema.virtual('totalEarnings').get(function () { return this._totalEarnings; });
runnerSchema.virtual('totalEarnings').set(function () {
  throw new Error('Use runner.recordEarning(amount) to update totalEarnings.');
});

// Indexes
runnerSchema.index({ email: 1 });
runnerSchema.index({ phone: 1 }, { sparse: true });
runnerSchema.index({ role: 1 });
runnerSchema.index({ isActive: 1 });
runnerSchema.index({ isVerified: 1 });
runnerSchema.index({ isVerifiedKyc: 1 });
runnerSchema.index({ createdAt: -1 });
runnerSchema.index({ lastLogin: -1 });
runnerSchema.index({ location: '2dsphere' });
runnerSchema.index({ role: 1, isOnline: 1, isAvailable: 1 });
runnerSchema.index({ fleetType: 1 });

runnerSchema.index({
  kycStatus: 1,
  isOnline: 1,
  isAvailable: 1,
  'verificationDocuments.nin.status': 1,
  'verificationDocuments.driverLicense.status': 1
});

// Pre-save middlewares
runnerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

runnerSchema.pre('save', function (next) {
  if (this.isModified() && !this.isModified('lastActive')) {
    this.lastActive = new Date();
  }
  next();
});

runnerSchema.pre('save', function (next) {
  if (this.isModified('latitude') || this.isModified('longitude')) {
    if (this.latitude && this.longitude) {
      this.location = {
        type: 'Point',
        coordinates: [this.longitude, this.latitude]
      };
      this.lastLocationUpdate = new Date();
    }
  }
  next();
});

runnerSchema.pre('save', function (next) {
  if (!this.isNew && this.isModified('_totalEarnings')) {
    return next(new Error('Direct _totalEarnings mutation blocked. Use runner.recordEarning().'));
  }
  next();
});

// Instance methods
runnerSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

runnerSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

runnerSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  const updates = { $inc: { failedLoginAttempts: 1 } };

  if (this.failedLoginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }

  return this.updateOne(updates);
};

runnerSchema.methods.getPublicProfile = function () {
  const publicProfile = {
    _id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    avatar: this.avatar,
    bio: this.bio,
    createdAt: this.createdAt
  };

  if (this.isEmailPublic) {
    publicProfile.email = this.email;
  }
  if (this.isPhonePublic && this.phone) {
    publicProfile.phone = this.phone;
  }

  return publicProfile;
};

runnerSchema.methods.recordEarning = async function (amount) {
  if (typeof amount !== 'number' || amount <= 0) throw new Error('Earning amount must be positive');
  await this.constructor.findByIdAndUpdate(this._id, {
    $inc: { _totalEarnings: amount, completedOrders: 1, totalRuns: 1 },
  });
  this._totalEarnings += amount;
  return this;
};

runnerSchema.methods.resetDailyErrandCount = async function () {
  await this.constructor.findByIdAndUpdate(this._id, {
    $set: { dailyErrandCount: 0, lastErrandResetDate: new Date() },
  });
  this.dailyErrandCount = 0;
  return this;
};

runnerSchema.methods.incrementErrandCount = async function () {
  const updated = await this.constructor.findByIdAndUpdate(
    this._id,
    { $inc: { dailyErrandCount: 1 } },
    { new: true }
  );
  this.dailyErrandCount = updated.dailyErrandCount;
  return this;
};

// Static methods
runnerSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

runnerSchema.statics.cleanupExpiredTokens = function () {
  const now = new Date();
  return this.updateMany({
    $or: [
      { verificationExpires: { $lt: now } },
      { resetPasswordExpires: { $lt: now } },
      { phoneVerificationExpires: { $lt: now } }
    ]
  }, {
    $unset: {
      verificationToken: 1,
      verificationExpires: 1,
      resetPasswordToken: 1,
      resetPasswordExpires: 1,
      phoneVerificationOTP: 1,
      phoneVerificationExpires: 1,
      emailVerificationOTP: 1,
      emailVerificationExpires: 1,
    }
  });
};

// Query helpers
runnerSchema.query.active = function () {
  return this.where({ isActive: true });
};

runnerSchema.query.verified = function () {
  return this.where({ isVerified: true });
};

runnerSchema.query.search = function (searchTerm) {
  if (!searchTerm) return this;
  const regex = new RegExp(searchTerm, 'i');
  return this.where({
    $or: [
      { firstName: regex },
      { lastName: regex },
      { email: regex }
    ]
  });
};


function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

runnerSchema.statics.findNearbyRunners = async function ({
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  fleetType,
}) {
  const matchingConfig = await getMatchingConfig();
  const PICKUP_MAX = matchingConfig.pickupMaxDistance;
  const isPedestrian = fleetType?.toLowerCase() === 'pedestrian';

  if (isPedestrian) {
    const RUNNER_LEG_MAX = matchingConfig.pedestrianMaxRunnerLeg; 
    const DELIVERY_LEG_MAX = matchingConfig.pedestrianMaxDeliveryLeg; 
    const TOTAL_MAX = matchingConfig.pedestrianTotalMax;            

    // Guard: pickup → delivery must be ≤ pedestrianMaxDeliveryLeg
    if (deliveryLat && deliveryLng) {
      const pickupToDelivery = haversineDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);
      if (pickupToDelivery > DELIVERY_LEG_MAX) {
        console.log('[findNearbyRunners] pedestrian: pickup→delivery too far:', pickupToDelivery);
        return [];
      }
    }

    const results = await this.find({
      role: 'runner',
      isActive: true,
      isAvailable: true,
      fleetType: 'pedestrian',
    })
      .select('firstName lastName phone currentRequest location latitude longitude avatar ' +
        'kycStatus verificationDocuments biometricVerification isOnline isAvailable ' +
        'fleetType isPhoneVerified isEmailVerified rating totalRatings totalRuns')
      .lean();

    return results.filter((runner) => {
      if (!runner.latitude || !runner.longitude) return false;

      const runnerToPickup = haversineDistance(
        runner.latitude, runner.longitude, pickupLat, pickupLng
      );

      if (runnerToPickup > RUNNER_LEG_MAX) return false;

      // Dynamic delivery leg budget
      const deliveryLegBudget = TOTAL_MAX - runnerToPickup;

      if (deliveryLat && deliveryLng) {
        const pickupToDelivery = haversineDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);
        if (pickupToDelivery > deliveryLegBudget) return false;
      }

      // Attach computed distances for use in matching/sorting
      runner._runnerToPickup = Math.round(runnerToPickup);
      runner._deliveryLegBudget = Math.round(deliveryLegBudget);

      return true;
    });
  }

  // ── Non-pedestrian ────────────────────────────────────────────────────────
  const query = {
    role: 'runner',
    isActive: true,
    isAvailable: true,
    fleetType,
  };

  const results = await this.find(query)
    .select('firstName lastName phone currentRequest location latitude longitude avatar ' +
      'kycStatus verificationDocuments biometricVerification isOnline isAvailable ' +
      'fleetType isPhoneVerified isEmailVerified rating totalRatings totalRuns')
    .lean();

  return results.filter((runner) => {
    if (!runner.latitude || !runner.longitude) return false;
    const runnerToPickup = haversineDistance(
      runner.latitude, runner.longitude, pickupLat, pickupLng
    );
    return runnerToPickup <= PICKUP_MAX;
  });
};

module.exports = mongoose.model('Runner', runnerSchema);