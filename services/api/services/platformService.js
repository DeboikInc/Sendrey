const logger = require('../utils/logger');
const redis = require('../config/redis');
const { resolveBankCode } = require('../utils/platformBankResolver');
const PlatformSettings = require('../models/PlatformSettings');
const User = require('../models/User');

const DISCOUNT_CHANNEL = 'platformDiscount:updated';
class PlatformService {
  constructor() {
    this.cachedDiscount = null;
    this.discountLoadingPromise = null;
  }

  getActive = async () => {
    const settings = await PlatformSettings.findOneAndUpdate(
      { key: 'active' },
      { $setOnInsert: { key: 'active' } },
      { new: true, upsert: true }
    ).lean();
    return settings;
  }

  getDiscount = async () => {
    if (this.cachedDiscount !== null) return this.cachedDiscount;

    if (!this.discountLoadingPromise) {
      this.discountLoadingPromise = this.getActive()
        .then((doc) => {
          this.cachedDiscount = Number(doc.discount) || 0;
          return this.cachedDiscount;
        })
        .finally(() => {
          this.discountLoadingPromise = null;
        });
    }
    return this.discountLoadingPromise;
  };

  invalidateDiscount = () => {
    this.cachedDiscount = null;
    logger.info('[discountCache] Cache invalidated — next call will refetch from DB');
  };

  initDiscountSubscriber = async () => {
    await this.getDiscount();

    const subscriber = redis.getSubscriber();
    await subscriber.subscribe(DISCOUNT_CHANNEL, (err, count) => {
      if (err) logger.error('[discountCache] Subscribe failed', { message: err.message });
      else logger.info(`Subscribed to ${DISCOUNT_CHANNEL} (${count} channels)`);
    });

    subscriber.on('message', (channel) => {
      if (channel === DISCOUNT_CHANNEL) this.invalidateDiscount();
    });
  };

  updateDiscount = async (percent, userId) => {
    const value = Number(percent);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      const err = new Error('Discount must be a number between 0 and 100');
      err.status = 400;
      throw err;
    }

    const set = { discount: value };
    if (userId) set.updatedBy = userId;

    const settings = await PlatformSettings.findOneAndUpdate(
      { key: 'active' },
      { $set: set, $setOnInsert: { key: 'active' } },
      { new: true, runValidators: true, upsert: true, setDefaultsOnInsert: true }
    );

    this.invalidateDiscount();
    await redis.getPublisher().publish(DISCOUNT_CHANNEL, JSON.stringify({ discount: value }));

    return settings;
  };

  // Validate the value that came from the URL against the current config
  validateDiscount = async (submitted) => {
    const current = await this.getDiscount();
    const value = Number(submitted);
    if (!current || !Number.isFinite(value) || value !== current) {
      return { valid: false, percent: 0 };
    }
    return { valid: true, percent: current };
  };

  applyDiscount = (total, percent) => {
    if (!percent) return { total, discountAmount: 0 };
    const discountAmount = Math.round(total * (percent / 100));
    return { total: total - discountAmount, discountAmount };
  };

  resolveDiscount = async (submitted, total, userId) => {
    if (userId) {
      const u = await User.findById(userId).select('discountRedeemedAt').lean();
      if (u?.discountRedeemedAt) {
        return { valid: false, redeemed: true, percent: 0, discountAmount: 0, total };
      }
    }
    const { valid, percent } = await this.validateDiscount(submitted);
    if (!valid) return { valid: false, percent: 0, discountAmount: 0, total };
    const { total: discounted, discountAmount } = this.applyDiscount(total, percent);
    return { valid: true, percent, discountAmount, total: discounted };
  };

  updateBankAccount = async (accountNumber, bankCode) => {
    try {
      const { bankName, accountName } = await resolveBankCode(accountNumber, bankCode);

      return await PlatformSettings.findOneAndUpdate(
        { key: 'active' },
        { $set: { platformBankAccount: accountNumber, bankCode, bankName, accountName } },
        { new: true, upsert: true }
      );
    } catch (err) {
      logger.error('[platformService] updateBankAccount failed', {
        accountNumber,
        bankCode,
        message: err.message,
      });
      throw err;
    }
  }
}

module.exports = new PlatformService();