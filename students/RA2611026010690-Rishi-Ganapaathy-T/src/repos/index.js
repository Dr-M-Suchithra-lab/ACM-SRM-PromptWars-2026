/**
 * Repository Factory
 * Uses the zero-setup InMemoryRepo initialized from seed data.
 */

const logger = require('../utils/logger');
const InMemoryRepo = require('./inMemoryRepo');

let instance = null;

function getRepository() {
  if (instance) return instance;
  instance = new InMemoryRepo();
  logger.info('[RepoFactory] Active Adapter: InMemoryRepo (Zero setup)');
  return instance;
}

module.exports = {
  getRepository,
};
