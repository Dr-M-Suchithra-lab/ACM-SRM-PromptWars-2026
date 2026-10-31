/**
 * Authentication Routes
 * Role-based login with scrypt password verification and signed session tokens.
 */

const express = require('express');
const router = express.Router();
const { getRepository } = require('../repos');
const { verifyPassword, signToken } = require('../utils/crypto');
const { validateBody, loginSchema } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth');
const { getIndustryConfig } = require('../config/industries');

/**
 * POST /api/auth/login
 * Authenticate with email & password
 */
router.post('/login', authLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const repo = getRepository();
    const user = await repo.findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      industry: user.industry,
    });

    const industryConfig = getIndustryConfig(user.industry);

    res.json({
      token,
      user: {
        id: user.id,
        folderSlug: user.folderSlug,
        email: user.email,
        name: user.name,
        role: user.role,
        roleTitle: user.roleTitle,
        industry: user.industry,
        department: user.department,
        phone: user.phone,
        preferredLanguage: user.preferredLanguage || 'en',
        avatar: user.avatar,
        passportId: user.passportId,
      },
      industry: {
        id: industryConfig.id,
        name: industryConfig.name,
        terminology: industryConfig.terminology,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Returns authenticated user profile
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const repo = getRepository();
    const user = await repo.findUserById(req.user.id);
    const industryConfig = getIndustryConfig(user.industry);

    res.json({
      user: {
        id: user.id,
        folderSlug: user.folderSlug,
        email: user.email,
        name: user.name,
        role: user.role,
        roleTitle: user.roleTitle,
        industry: user.industry,
        department: user.department,
        phone: user.phone,
        preferredLanguage: user.preferredLanguage || 'en',
        avatar: user.avatar,
        passportId: user.passportId,
      },
      industry: {
        id: industryConfig.id,
        name: industryConfig.name,
        terminology: industryConfig.terminology,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/demo-users
 * Returns list of seeded demo personas for fast evaluation
 */
router.get('/demo-users', async (_req, res, next) => {
  try {
    const repo = getRepository();
    const users = await repo.listUsers();
    const sanitized = users.map((u) => ({
      id: u.id,
      folderSlug: u.folderSlug,
      email: u.email,
      name: u.name,
      role: u.role,
      roleTitle: u.roleTitle,
      industry: u.industry,
      department: u.department,
      preferredLanguage: u.preferredLanguage || 'en',
      avatar: u.avatar,
      demoPassword: u.demoPassword,
    }));
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

