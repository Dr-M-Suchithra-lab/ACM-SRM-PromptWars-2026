/**
 * Authentication & Role-Based Access Control (RBAC) Middleware
 * Verifies signed session tokens and enforces role restrictions.
 */

const { verifyToken } = require('../utils/crypto');
const { getRepository } = require('../repos');

/**
 * Middleware to require valid session token
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token required. Please sign in.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    const repo = getRepository();
    const user = await repo.findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User account not found.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      industry: user.industry,
      department: user.department,
      roleTitle: user.roleTitle,
      preferredLanguage: user.preferredLanguage || 'en',
    };
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired session token.',
    });
  }
}

/**
 * Middleware to restrict route to specific roles
 * @param {string|string[]} roles - 'admin' | 'worker'
 */
function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Sign-in required.' });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Requires one of the following roles: ${allowed.join(', ')}`,
      });
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};

