/**
 * Centralised Express Error Handler
 * Standardises JSON error responses and protects against information leakage.
 */

const logger = require('../utils/logger');
const env = require('../config/env');

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const isProd = env.NODE_ENV === 'production';

  // Log full error safely on server
  logger.error(`[HTTP ${status}] ${err.message}`, {
    path: req.originalUrl,
    method: req.method,
    stack: isProd ? undefined : err.stack,
  });

  const response = {
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.',
  };

  if (!isProd && err.stack) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}

module.exports = errorHandler;

