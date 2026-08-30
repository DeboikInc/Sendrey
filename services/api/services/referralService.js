const crypto = require('crypto');
const Referral = require('../models/Referral');
const ReferralConfig = require('../config/referralConfig');
const User = require('../models/User');
const Runner = require('../models/Runner');
const Wallet = require('../models/Wallet');
const LedgerEntry = require('../models/LedgerEntry');
const { withTransaction } = require('../utils/withTransaction');
const { notifyReferralBonus } = require('./notificationService');
const redisClient = require('../config/redis'); // adjust path to match existing redis client

const CONFIG_CHANNEL = 'referral_config_invalidate';
let cachedConfig = null;

const MODEL_MAP = { User, Runner };
const WALLET_TYPE_MAP = { User: 'user', Runner: 'runner' };

// Subscribe to invalidation so all instances drop their in-memory cache,
// same pattern as pricingConfigService/matchingConfigService.
if (redisClient?.subscribe) {
  redisClient.subscribe(CONFIG_CHANNEL, () => {
    cachedConfig = null;
  });
}

async function getConfig() {
  if (cachedConfig) return cachedConfig;

  let config = await ReferralConfig.findOne({ singleton: 'referral_config' });
  if (!config) {
    config = await ReferralConfig.create({ singleton: 'referral_config', bonusAmount: 0 });
  }
  cachedConfig = config;
  return config;
}

async function updateConfig(adminId, bonusAmount) {
  if (typeof bonusAmount !== 'number' || bonusAmount < 0) {
    throw new Error('bonusAmount must be a non-negative number');
  }

  const config = await ReferralConfig.findOneAndUpdate(
    { singleton: 'referral_config' },
    { bonusAmount, updatedBy: adminId },
    { new: true, upsert: true }
  );

  cachedConfig = config;
  if (redisClient?.publish) {
    await redisClient.publish(CONFIG_CHANNEL, 'invalidate');
  }

  return config;
}

function generateReferralCode() {
  const prefix = 'SNDRY';
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}${suffix}`;
}

// Call this at signup time for both User and Runner creation flows.
// Retries on the rare collision against the unique index.
async function assignReferralCode(personDoc, personModel) {
  const Model = MODEL_MAP[personModel];
  if (!Model) throw new Error(`Unknown referral participant model: ${personModel}`);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    const exists = await Model.exists({ referralCode: code });
    if (!exists) {
      personDoc.referralCode = code;
      await personDoc.save();
      return code;
    }
  }
  throw new Error('Failed to generate unique referral code after 5 attempts');
}

// Call this right after a new User/Runner is created, if they signed up with a code.
async function applyReferralCode({ code, referredId, referredModel }) {
  if (!code) return null;

  const referrerUser = await User.findOne({ referralCode: code });
  const referrerRunner = referrerUser ? null : await Runner.findOne({ referralCode: code });
  const referrer = referrerUser || referrerRunner;
  if (!referrer) return null; // invalid code — fail silently, don't block signup

  const referrerModel = referrerUser ? 'User' : 'Runner';

  if (String(referrer._id) === String(referredId) && referrerModel === referredModel) {
    return null; // can't refer self
  }

  const alreadyReferred = await Referral.findOne({ referred: referredId, referredModel });
  if (alreadyReferred) return null;

  return Referral.create({
    referrer: referrer._id,
    referrerModel,
    referred: referredId,
    referredModel,
    codeUsed: code,
    status: 'pending',
  });
}

// atomic, claim order completed 
async function checkAndAwardBonus(personId, personModel) {
  const Model = MODEL_MAP[personModel];
  if (!Model) throw new Error(`Unknown referral participant model: ${personModel}`);

  const referral = await Referral.findOneAndUpdate(
    { referred: personId, referredModel: personModel, status: 'pending' },
    { status: 'processing' },
    { new: true }
  );
  if (!referral) return null;

  try {
    const person = await Model.findById(personId).select('firstName lastName email');
    const referredName = person?.firstName || person?.lastName || person?.email;

    const config = await getConfig();
    if (!config.bonusAmount || config.bonusAmount <= 0) {
      // no bonus configured — mark completed but skip wallet/ledger/notification
      referral.status = 'completed';
      await referral.save();
      return referral;
    }

    const result = await withTransaction(async (session) => {
      const wallet = await Wallet.findOne({
        userId: referral.referrer,
        userType: WALLET_TYPE_MAP[referral.referrerModel],
      }).session(session);
      if (!wallet) throw new Error(`Wallet not found for referrer ${referral.referrer}`);

      await wallet.credit(
        config.bonusAmount,
        `referral-${referral._id}`,
        { type: 'referral_bonus', referralId: referral._id }
      );

      await LedgerEntry.create([{
        userId: referral.referrer,
        userModel: referral.referrerModel,
        type: 'referral_bonus',
        grossAmount: config.bonusAmount,
        netAmount: config.bonusAmount,
        providerFee: 0,
        platformFee: 0,
        netPlatformFee: 0,
        runnerFee: 0,
        provider: 'system',
        description: `Referral bonus for referring ${referredName}`,
        status: 'completed',
      }], { session });

      referral.status = 'completed';
      referral.bonusAmount = config.bonusAmount;
      referral.bonusAwardedAt = new Date();
      await referral.save({ session });

      return referral;
    });

    await notifyReferralBonus({
      recipientId: referral.referrer,
      recipientType: WALLET_TYPE_MAP[referral.referrerModel],
      amount: config.bonusAmount,
      referredName,
    }).catch((err) => console.error('notifyReferralBonus failed (non-critical):', err.message));

    return result;
  } catch (err) {
    // Release the claim so it isn't stuck in 'processing' forever — a later
    // retry can still award it.
    await Referral.findOneAndUpdate(
      { _id: referral._id, status: 'processing' },
      { status: 'pending' }
    ).catch(() => {});
    throw err;
  }
}

async function getMyReferrals(personId, personModel) {
  return Referral.find({ referrer: personId, referrerModel: personModel })
    .populate('referred', 'firstName lastName email phone')
    .sort({ createdAt: -1 });
}

async function getAllReferrals({ status, page = 1, limit = 20 } = {}) {
  const query = {};
  if (status) query.status = status;

  const [referrals, total] = await Promise.all([
    Referral.find(query)
      .populate('referrer', 'firstName lastName email phone referralCode')
      .populate('referred', 'firstName lastName email phone referralCode')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Referral.countDocuments(query),
  ]);

  return { referrals, total, page, limit };
}

module.exports = {
  getConfig,
  updateConfig,
  generateReferralCode,
  assignReferralCode,
  applyReferralCode,
  checkAndAwardBonus,
  getMyReferrals,
  getAllReferrals,
};