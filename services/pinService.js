const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Runner = require('../models/Runner');

const getModel = (role) => (role === 'runner' ? Runner : User);
const hashPin = (pin) => bcrypt.hash(pin, 10);
const comparePin = (raw, hashed) => bcrypt.compare(raw, hashed);
const validatePinFormat = (pin) => /^\d{4}$/.test(pin);

const smsService = require('./smsService');
const crypto = require('crypto');


// In-memory OTP store (use Redis in production)
const otpStore = new Map();

// ── setPin ────────────────────────────────────────────────────────────────────
// One-time setup. Fails if PIN already exists (use resetPin).
const setPin = async ({ userId, role, pin }) => {
  if (!validatePinFormat(pin))
    throw Object.assign(new Error('PIN must be exactly 4 digits'), { statusCode: 400 });

  const user = await getModel(role).findById(userId).select('+pin');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  if (user.pin)
    throw Object.assign(new Error('PIN already set. Use reset PIN to change it.'), { statusCode: 409 });

  user.pin = await hashPin(pin);
  await user.save();
  return { message: 'PIN set successfully' };
};

// ── verifyPin ─────────────────────────────────────────────────────────────────
// Called before any payment action. Returns { valid: true/false }.
const verifyPin = async ({ userId, role, pin }) => {
  if (!validatePinFormat(pin))
    throw Object.assign(new Error('PIN must be exactly 4 digits'), { statusCode: 400 });

  const user = await getModel(role).findById(userId).select('+pin');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  if (!user.pin)
    throw Object.assign(new Error('No PIN set on this account'), { statusCode: 400 });

  const valid = await comparePin(pin, user.pin);
  return { valid };
};

// ── resetPin ──────────────────────────────────────────────────────────────────
// User remembers current PIN, wants to change it.
const resetPin = async ({ userId, role, currentPin, newPin }) => {
  if (!validatePinFormat(currentPin) || !validatePinFormat(newPin))
    throw Object.assign(new Error('PINs must be exactly 4 digits'), { statusCode: 400 });

  if (currentPin === newPin)
    throw Object.assign(new Error('New PIN must differ from current PIN'), { statusCode: 400 });

  const user = await getModel(role).findById(userId).select('+pin');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  if (!user.pin)
    throw Object.assign(new Error('No PIN set. Use set PIN.'), { statusCode: 400 });

  const isMatch = await comparePin(currentPin, user.pin);
  if (!isMatch)
    throw Object.assign(new Error('Current PIN is incorrect'), { statusCode: 401 });

  user.pin = await hashPin(newPin);
  await user.save();
  return { message: 'PIN updated successfully' };
};

// ── forgotPin ─────────────────────────────────────────────────────────────────
// User forgot PIN. Identity already proven via OTP upstream (protect middleware
// should verify OTP was completed before calling this). Just sets new PIN.
const forgotPin = async ({ userId, role, newPin, confirmPin }) => {
  const verified = otpStore.get(`verified_${userId.toString()}`);
  if (!verified || Date.now() > verified.expires)
    throw Object.assign(new Error('OTP verification required'), { statusCode: 403 });

  if (!validatePinFormat(newPin) || !validatePinFormat(confirmPin))
    throw Object.assign(new Error('PINs must be exactly 4 digits'), { statusCode: 400 });
  if (newPin !== confirmPin)
    throw Object.assign(new Error('PINs do not match'), { statusCode: 400 });

  const user = await getModel(role).findById(userId).select('+pin');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  user.pin = await hashPin(newPin);
  await user.save();

  otpStore.delete(`verified_${userId}`); // clean up
  return { message: 'PIN reset successfully' };
};

const sendForgotPinOtp = async ({ userId, role }) => {
  const user = await getModel(role).findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  if (!user.phone) throw Object.assign(new Error('No phone number on account'), { statusCode: 400 });

  const otp = crypto.randomInt(100000, 999999).toString();
  const expires = Date.now() + 10 * 60 * 1000; // 10 mins

  otpStore.set(userId.toString(), { otp, expires });

  await smsService.sendOTP(user.phone, otp);
  return { message: 'OTP sent to your phone number' };
};

const verifyForgotPinOtp = async ({ userId, otp }) => {
  const record = otpStore.get(userId.toString());
  if (!record) throw Object.assign(new Error('OTP not found or expired'), { statusCode: 400 });
  if (Date.now() > record.expires) {
    otpStore.delete(userId.toString());
    throw Object.assign(new Error('OTP expired'), { statusCode: 400 });
  }
  if (record.otp !== otp) throw Object.assign(new Error('Invalid OTP'), { statusCode: 401 });

  otpStore.delete(userId.toString());
  // Mark OTP verified in memory so forgotPin can proceed
  otpStore.set(`verified_${userId}`, { verified: true, expires: Date.now() + 5 * 60 * 1000 });
  return { message: 'OTP verified' };
};

module.exports = { setPin, verifyPin, resetPin, forgotPin, sendForgotPinOtp, verifyForgotPinOtp };