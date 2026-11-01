/**
 * Cryptographic & Authentication Utilities
 * Handles secure password hashing, JWT session signing, and one-way feedback hashing.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Hash a password using scrypt with random salt
 * @param {string} password
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify a password against an scrypt hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, hash) {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    if (!salt || !key) return resolve(false);

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      try {
        const keyBuffer = Buffer.from(key, 'hex');
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Sign a session JWT
 * @param {object} payload - User claims
 * @param {string} [expiresIn='7d'] - Expiry duration
 * @returns {string} Signed token
 */
function signToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
}

/**
 * Verify a session JWT
 * @param {string} token
 * @returns {object} Decoded token payload
 */
function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

/**
 * Generate a one-way salted hash for anonymous feedback rate-limiting.
 * CRITICAL PRIVACY PROPERTY:
 * The feedback record stores NEITHER workerId nor this hash.
 * This hash is only checked against a temporary rate-limit lookup table
 * to enforce 1 feedback per window, preventing spam while ensuring zero trace in stored records.
 *
 * @param {string} workerId - Worker ID
 * @param {string} [windowKey='today'] - Time window (e.g. 2026-W43)
 * @returns {string} 256-bit hexadecimal one-way digest
 */
function computeAnonymousRateLimitToken(workerId, windowKey = '') {
  const currentPeriod = windowKey || new Date().toISOString().slice(0, 10);
  return crypto
    .createHmac('sha256', env.FEEDBACK_SALT)
    .update(`${workerId}::${currentPeriod}`)
    .digest('hex');
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  computeAnonymousRateLimitToken,
};

