/**
 * Industry Configuration Routes
 * Enables runtime configuration inspection and demo sector switching.
 */

const express = require('express');
const router = express.Router();
const { getIndustryConfig, listIndustries, industries } = require('../config/industries');

/**
 * GET /api/industry/current
 * Return active industry profile (terminology, hazard categories, roles, wage rules)
 */
router.get('/current', (req, res) => {
  const selected = req.query.id || process.env.ACTIVE_INDUSTRY || 'construction';
  const config = getIndustryConfig(selected);
  res.json(config);
});

/**
 * GET /api/industry/list
 * List all supported industries (construction, college, hospital)
 */
router.get('/list', (_req, res) => {
  res.json(listIndustries());
});

/**
 * POST /api/industry/switch
 * Switch the active industry for demo inspection
 */
router.post('/switch', (req, res) => {
  const { industryId } = req.body;
  if (!industryId || !industries[industryId.toLowerCase()]) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `Invalid industry '${industryId}'. Choose from: ${Object.keys(industries).join(', ')}`,
    });
  }

  process.env.ACTIVE_INDUSTRY = industryId.toLowerCase();
  res.json({
    message: `Active industry successfully switched to '${industryId}'`,
    activeIndustry: getIndustryConfig(industryId),
  });
});

module.exports = router;

