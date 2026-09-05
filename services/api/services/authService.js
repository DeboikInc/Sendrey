const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Runner = require('../models/Runner');
const Wallet = require('../models/Wallet')
const logger = require('../utils/logger');
const AuthSession = require('../models/AuthSession');
const paymentService = require('./paymentServices');
const referralService = require('./referralService');
const { sendEmailEvent } = require('../kafka/producers/emailProducer');

class AuthService {
  _generateOpaqueToken = () => crypto.randomBytes(40).toString('hex');
  _hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

  /**
   * Register new user or runner
   */
  async register(userData, creatorUserRole, userType = 'user') {
    try {
      const Model = userType === 'runner' ? Runner : User;

      const existingByEmail = userData.email
        ? await Model.findOne({ email: userData.email })
        : null;

      if (existingByEmail) {
        if (userData.phone && existingByEmail.phone && existingByEmail.phone !== userData.phone) {
          const err = new Error('This email or phone number is associated with another sendrey account');
          err.statusCode = 409;
          err.field = 'phone';
          throw err;
        }

        if (!existingByEmail.isVerified) {
          return { user: existingByEmail, existing: true };
        }
        const err = new Error('Account already exists');
        err.statusCode = 409;
        err.userName = existingByEmail.firstName;
        err.userEmail = existingByEmail.email;
        err.userPhone = existingByEmail.phone;
        err.kycStatus = {
          isVerified: existingByEmail.isVerified,
          isEmailVerified: existingByEmail.isEmailVerified,
          ninStatus: existingByEmail.verificationDocuments?.nin?.status || 'not_submitted',
          driverLicenseStatus: existingByEmail.verificationDocuments?.driverLicense?.status || 'not_submitted',
          selfieVerified: existingByEmail.biometricVerification?.selfieVerified || false,
          selfieStatus: existingByEmail.biometricVerification?.status || 'not_submitted',
          overallVerified: existingByEmail.isVerifiedKyc || false,
        };
        throw err;
      }

      if (userData.phone) {
        const phoneConflict = await Model.findOne({ phone: userData.phone });
        if (phoneConflict) {
          const err = new Error('This phone number is already registered to another account');
          err.statusCode = 409;
          err.field = 'phone';
          throw err;
        }
      }

      let role = userType;

      if (userType === 'user') {
        if (userData.role === 'admin' || userData.role === 'super-admin') {
          if (!creatorUserRole || !['admin', 'super-admin'].includes(creatorUserRole)) {
            role = 'user';
          } else if (userData.role === 'admin') {
            role = 'admin';
          } else if (userData.role === 'super-admin') {
            // Check if a super-admin already exists
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

  /**
   * Orchestrates the full user signup flow: creates the account, then handles
   * OTP + email verification, virtual account provisioning, and referral
   * code assignment/redemption. Virtual account and referral steps are
   * non-blocking — a failure there shouldn't fail signup.
   */
  async completeUserRegistration(userData, creatorUserRole) {
    const { user, existing } = await this.register(userData, creatorUserRole, 'user');

    if (['admin', 'super-admin'].includes(user.role)) {
      return { user, isAdmin: true };
    }

    const otp = await this.generateEmailVerificationOTP(user._id, userData.email, 'user');

    logger.info('Sending EMAIL SMS', {
      to: userData.email,
      userId: user._id,
      userType: 'user',
      existing: !!existing,
      endpoint: 'register-user',
    });

    if (user.email && !existing) {
      await sendEmailEvent({
        type: 'otp',
        to: user.email,
        subject: 'Your Sendrey Verification Code',
        template: 'otpEmail',
        data: { name: user.firstName, otp },
      });
    }

    try {
      await paymentService.createVirtualAccount(
        user._id, user.email, `${user.firstName} ${user.lastName}`, user.phone
      );
    } catch (err) {
      logger.error('Virtual account creation failed:', err.message);
    }

    try {
      await referralService.assignReferralCode(user, 'User');
      if (userData.referralCode) {
        await referralService.applyReferralCode({
          code: userData.referralCode,
          referredId: user._id,
          referredModel: 'User',
        });
      }
    } catch (err) {
      logger.error('Referral setup failed:', err.message);
    }

    return { user, otp, existing };
  }

  /**
   * Orchestrates the full runner signup flow — same shape as
   * completeUserRegistration, for the Runner model.
   */
  async completeRunnerRegistration(runnerData) {
    runnerData.role = 'runner';

    const { user: runner } = await this.register(runnerData, null, 'runner');

    const otp = await this.generateEmailVerificationOTP(runner._id, runnerData.email, 'runner');

    logger.info('Sending OTP SMS', {
      to: runnerData.phone,
      userId: runner._id,
      userType: 'runner',
      existing: !!runner.existing,
      endpoint: 'register-runner',
    });

    if (runner.email) {
      await sendEmailEvent({
        type: 'otp',
        to: runner.email,
        subject: 'Your Sendrey Verification Code',
        template: 'otpEmail',
        data: { name: runner.firstName, otp },
      });
    }

    if (!['admin', 'super-admin'].includes(runner.role)) {
      try {
        await paymentService.createVirtualAccount(
          runner._id, runner.email, `${runner.firstName} ${runner.lastName}`, runner.phone
        );
      } catch (err) {
        logger.error('Virtual account creation failed:', err.message);
      }
    }

    try {
      await referralService.assignReferralCode(runner, 'Runner');
      if (runnerData.referralCode) {
        await referralService.applyReferralCode({
          code: runnerData.referralCode,
          referredId: runner._id,
          referredModel: 'Runner',
        });
      }
    } catch (err) {
      logger.error('Referral setup failed:', err.message);
    }

    return { runner, otp };
  }

  async checkExistingUser(email, phone, userType = 'user') {
    const Model = userType === 'runner' ? Runner : User;
    const user = await Model.findOne({ email });

    if (!user) return null;

    if (phone && user.phone && user.phone !== phone) {
      const err = new Error('This email or phone number is associated with another sendrey account');
      err.statusCode = 409;
      err.field = 'phone';
      throw err;
    }

    return {
      exists: true,
      firstName: user.firstName,
      fleetType: user.fleetType,
      kycStatus: userType === 'runner' ? {
        isVerified: user.isVerified,
        isEmailVerified: user.isEmailVerified,
        ninStatus: user.verificationDocuments?.nin?.status || 'not_submitted',
        driverLicenseStatus: user.verificationDocuments?.driverLicense?.status || 'not_submitted',
        bikerLicenseStatus: user.verificationDocuments?.bikerLicense?.status || 'not_submitted',
        selfieVerified: user.biometricVerification?.selfieVerified || false,
        overallVerified: user.isVerifiedKyc || false,
      } : {
        isVerified: user.isVerified,
        isEmailVerified: user.isEmailVerified,
      }
    };
  }

  async refreshTokens(refreshToken) {
    if (!refreshToken) {
      const err = new Error('No refresh token provided');
      err.statusCode = 401;
      throw err;
    }

    const tokenHash = this._hashToken(refreshToken);
    const newRefreshToken = this._generateOpaqueToken();
    const newTokenHash = this._hashToken(newRefreshToken);

    const session = await AuthSession.findOneAndUpdate(
      { tokenHash },
      {
        $set: {
          tokenHash: newTokenHash,
          lastUsedAt: new Date(),
          expiresAt: new Date(Date.now() + parseInt(process.env.SESSION_TTL_MS || 5184000000)),
        },
      },
      { new: false }
    );

    if (!session) {
      const err = new Error('Session expired or revoked');
      err.statusCode = 401;
      throw err;
    }

    if (session.expiresAt < new Date()) {
      await AuthSession.deleteOne({ _id: session._id });
      const err = new Error('Session expired');
      err.statusCode = 401;
      throw err;
    }

    const Model = session.userType === 'runner' ? Runner : User;
    const account = await Model.findById(session.userId);
    if (!account) {
      await AuthSession.deleteOne({ _id: session._id });
      const err = new Error('Account not found');
      err.statusCode = 404;
      throw err;
    }

    const accessToken = this.generateToken(account);
    return { accessToken, refreshToken: newRefreshToken, user: account, userType: session.userType };
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
        bikerLicenseStatus: user.verificationDocuments?.bikerLicense?.status || 'not_submitted',
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

    const otp = await this.generateEmailVerificationOTP(user._id, email, userType);
    return { user, otp };
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