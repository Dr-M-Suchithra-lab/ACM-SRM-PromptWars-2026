/**
 * Structured Application Logger
 * Automatically sanitizes sensitive keys (passwords, tokens, salts) before output.
 */

const SENSITIVE_KEYS = ['password', 'token', 'jwt', 'secret', 'salt', 'authorization', 'cookie', 'pepper'];

/**
 * Recursively sanitize objects to remove secrets from logs
 * @param {any} data
 * @returns {any}
 */
function sanitize(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitize);

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitize(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

const logger = {
  info: (msg, meta = {}) => {
    console.log(JSON.stringify({ level: 'info', time: new Date().toISOString(), message: msg, ...sanitize(meta) }));
  },
  warn: (msg, meta = {}) => {
    console.warn(JSON.stringify({ level: 'warn', time: new Date().toISOString(), message: msg, ...sanitize(meta) }));
  },
  error: (msg, meta = {}) => {
    console.error(JSON.stringify({ level: 'error', time: new Date().toISOString(), message: msg, ...sanitize(meta) }));
  },
};

module.exports = logger;

