/**
 * Transparent Payslip Routes
 * Itemised wage breakdown with multilingual "Why this amount" plain explanations.
 */

const express = require('express');
const router = express.Router();
const { PayslipService } = require('../services/payslipService');
const { requireAuth } = require('../middleware/auth');

const payslipService = new PayslipService();

/**
 * GET /api/payslips/current
 * Computes current cycle payslip with plain-language explanation
 */
router.get('/current', requireAuth, async (req, res, next) => {
  try {
    const lang = req.query.lang || req.user.preferredLanguage || 'en';
    const period = req.query.period || 'recent';
    const payslip = await payslipService.getWorkerPayslip(req.user.id, period, lang);
    res.json(payslip);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

