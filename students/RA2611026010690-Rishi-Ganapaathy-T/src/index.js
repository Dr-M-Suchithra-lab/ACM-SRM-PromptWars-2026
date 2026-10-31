/**
 * Server Startup & Port Binding
 * Listens on 0.0.0.0 and process.env.PORT (default 8080).
 */

const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { getRepository } = require('./repos');

// Initialize repository and seed data on startup
getRepository();

const PORT = env.PORT || 8080;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  logger.info(`[FairShift] Server listening on http://${HOST}:${PORT}`, {
    environment: env.NODE_ENV,
    activeIndustry: env.ACTIVE_INDUSTRY,
    dataStore: env.DATA_STORE,
  });
});

// Graceful shutdown handling
function gracefulShutdown(signal) {
  logger.info(`[FairShift] Received ${signal}. Closing HTTP server gracefully.`);
  server.close(() => {
    logger.info('[FairShift] HTTP server closed cleanly. Exiting.');
    process.exit(0);
  });

  // Force shutdown if cleanup exceeds 5 seconds
  setTimeout(() => {
    logger.error('[FairShift] Forced termination: graceful shutdown timed out.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

