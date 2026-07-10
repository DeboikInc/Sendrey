const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Runner = require('../models/Runner');
const Wallet = require('../models/Wallet')
const logger = require('../utils/logger');

class AuthService {
  /**
   * Register new user or runner
   */
  async register(userData, creatorUserRole, userType = 'user') {
    try {
      const Model = userType === 'runner' ? Runner : User;

      const conditions = [];
      if (userData.email) conditions.push({ email: userData.email });
      if (userData.phone) conditions.push({ phone: userData.phone });

      const existingUser = conditions.length
        ? await Model.findOne({ $or: conditions })
        : null;

      if (existingUser) {
        if (!existingUser.isVerified) {
          return { user: existingUser, existing: true };
        }
        const err = new Error('Account already exists');
        err.statusCode = 409;
        err.userName = existingUser.firstName;
        err.userEmail = existingUser.email;
        err.userPhone = existingUser.phone;
        err.kycStatus = {
          isVerified: existingUser.isVerified,
          isEmailVerified: existingUser.isEmailVerified,
          ninStatus: existingUser.verificationDocuments?.nin?.status || 'not_submitted',
          driverLicenseStatus: existingUser.verificationDocuments?.driverLicense?.status || 'not_submitted',
          selfieVerified: existingUser.biometricVerification?.selfieVerified || false,
          selfieStatus: existingUser.biometricVerification?.status || 'not_submitted',
          overallVerified: existingUser.isVerifiedKyc || false,
        };
        throw err;
      }

      let role = userType;

      if (userType === 'user') {
        if (userData.role === 'admin' || userData.role === 'super-admin') {
          if (!creatorUserRole || !['admin', 'super-admin'].includes(creatorUserRole)) {
            role = 'user';
          } else if (userData.role === 'admin') {
            role = 'admin';
          } else if (userData.role === 'super-admin') {
            const existingSuperAdmin = await Model.findOne({ role: 'super-admin' });
            if (existingSuperAdmin) {
              throw new Error('Super admin already exists');
            }
            role = 'super-admin';
          }
        }
      } else if (userType === 'runner') {
        role = 'runner';
      }

      const userDataWithLocation = {
        ...userData,
        role,
        isAvailable: true,
        isOnline: true,
        isVerified: ['admin', 'super-admin'].includes(role) ? true : false,
        isActive: true
      };

      if (userData.latitude && userData.longitude) {
        userDataWithLocation.location = {
          type: 'Point',
          coordinates: [userData.longitude, userData.latitude]
        };
      }

      const user = await Model.create(userDataWithLocation);

      if (!['admin', 'super-admin'].includes(role)) {
        await Wallet.create({
          userId: user._id,
          userType: userType === 'runner' ? 'runner' : 'user',
          lockedBalance: 0,
        });
      }

      return { user };
    } catch (error) {
      logger.error(`AuthService - ${userType} Register error:`, error);
      throw error;
    }
  }

  async checkExistingUser(email, userType = 'user') {
    const Model = userType === 'runner' ? Runner : User;
    const user = await Model.findOne({ email });

    if (!user) return null;

    return {
      exists: true,
      firstName: user.firstName,
      fleetType: user.fleetType,
      kycStatus: userType === 'runner' ? {
        isVerified: user.isVerified,
        isEmailVerified: user.isEmailVerified,
        ninStatus: user.verificationDocuments?.nin?.status || 'not_submitted',
        driverLicenseStatus: user.verificationDocuments?.driverLicense?.status || 'not_submitted',
        selfieVerified: user.biometricVerification?.selfieVerified || false,
        overallVerified: user.isVerifiedKyc || false,
      } : {
        isVerified: user.isVerified,
        isEmailVerified: user.isEmailVerified,
      }
    };
  }

  /**
   * Generate access token JWT (short-lived, stateless).
   */
  generateToken = (user) => {
    return jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  };

  /**
   * Legacy access+refresh JWT pair — used only by admin (password-based) auth.
   * Regular user/runner sessions use AuthController._createSession + AuthSession instead.
   */
  generateTokens = (user) => {
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN }
    );
    return { accessToken, refreshToken };
  };

  async generateVerificationToken(userId, userType = 'user') {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const Model = userType === 'runner' ? Runner : User;

    await Model.findByIdAndUpdate(userId, {
      verificationToken: token,
      verificationExpires: expires
    });

    return token;
  }

  async verifyEmail(token, userType = 'user') {
    const Model = userType === 'runner' ? Runner : User;

    const user = await Model.findOne({
      verificationToken: token,
      verificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    return user;
  }

  async generateEmailVerificationOTP(userId, email, userType = 'user') {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const Model = userType === 'runner' ? Runner : User;

    await Model.findByIdAndUpdate(userId, {
      emailVerificationOTP: otp,
      emailVerificationExpires: expires,
    }, { new: true }).select('+emailVerificationOTP');

    return otp;
  }

  async verifyEmailOTPCode(otp, userType = 'user') {
    const Model = userType === 'runner' ? Runner : User;

    const user = await Model.findOne({
      emailVerificationOTP: otp,
      emailVerificationExpires: { $gt: Date.now() }
    })
      .select('+emailVerificationOTP +emailVerificationExpires')
      .lean();

    if (!user) throw new Error('Invalid or expired OTP');

    await Model.findByIdAndUpdate(user._id, {
      $set: { isVerified: true, isEmailVerified: true },
      $unset: { emailVerificationOTP: 1, emailVerificationExpires: 1 }
    });

    return Model.findById(user._id).select('+pin');
  }

  async sendReturningUserOTP(email, userType = 'user') {
    const Model = userType === 'runner' ? Runner : User;

    const user = await Model.findOne({ email });
    if (!user) throw new Error('Account not found');

    const otp = await this.generateEmailVerificationOTP(user._id, email, userType);

    const kycStatus = userType === 'runner' ? {
      isVerified: user.isVerified,
      isEmailVerified: user.isEmailVerified,
      ninStatus: user.verificationDocuments?.nin?.status || 'not_submitted',
      driverLicenseStatus: user.verificationDocuments?.driverLicense?.status || 'not_submitted',
      selfieVerified: user.biometricVerification?.selfieVerified || false,
      overallVerified: user.isVerifiedKyc || false,
    } : {
      isVerified: user.isVerified,
      isEmailVerified: user.isEmailVerified,
    };

    return { user, otp, kycStatus };
  }

  async checkExistingUserOrRunner(email, userType = 'runner') {
    const Model = userType === 'runner' ? Runner : User;
    const user = await Model.findOne({ email });
    if (!user) throw new Error('Account not found');

    return {
      userName: user.firstName,
      kycStatus: {
        isVerified: user.isVerified,
        isEmailVerified: user.isEmailVerified,
        ninStatus: user.verificationDocuments?.nin?.status || 'not_submitted',
        driverLicenseStatus: user.verificationDocuments?.driverLicense?.status || 'not_submitted',
        selfieVerified: user.biometricVerification?.selfieVerified || false,
        overallVerified: user.isVerifiedKyc || false,
      }
    };
  }

  async resendVerificationEmail(email, userType = 'user') {
    const Model = userType === 'runner' ? Runner : User;

    const user = await Model.findOne({ email: email || '' });

    if (!user) {
      throw new Error(`${userType} not found`);
    }

    if (user.isVerified) {
      const err = new Error('Email is already verified');
      err.statusCode = 400;
      throw err;
    }

    const token = await this.generateVerificationToken(user._id, userType);
    return { user, token };
  }

  async generatePhoneVerificationOTP(userId, phone, userType = 'user') {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const Model = userType === 'runner' ? Runner : User;

    await Model.findByIdAndUpdate(userId, {
      phoneVerificationOTP: otp,
      phoneVerificationExpires: expires,
    });

    return otp;
  }

  async verifyPhoneOTP(userId, otp, userType = 'user') {
    const Model = userType === 'runner' ? Runner : User;

    const user = await Model.findOne({
      _id: userId,
      phoneVerificationOTP: otp,
      phoneVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new Error('Invalid or expired OTP');
    }

    user.isPhoneVerified = true;
    user.phoneVerificationOTP = undefined;
    user.phoneVerificationExpires = undefined;
    await user.save();

    return Model.findById(user._id).select('+pin');
  }
}

module.exports = new AuthService();