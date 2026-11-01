/**
 * Application Environment Configuration
 * Centralises all environment variables with defaults and validation.
 */

const env = {
  PORT: parseInt(process.env.PORT || '8080', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  ACTIVE_INDUSTRY: process.env.ACTIVE_INDUSTRY || 'construction',
  DATA_STORE: process.env.DATA_STORE || 'inmemory',
  JWT_SECRET: process.env.JWT_SECRET || 'fairshift-dev-secret-key-32chars-min-change-prod',
  FEEDBACK_SALT: process.env.FEEDBACK_SALT || 'fairshift-salt-rate-limit-default-pepper-2026',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || null,
  VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID || null,
  VERTEX_LOCATION: process.env.VERTEX_LOCATION || 'us-central1',
};

module.exports = env;

