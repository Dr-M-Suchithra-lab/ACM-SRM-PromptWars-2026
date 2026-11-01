/**
 * Anonymous Feedback Routes
 * Hard privacy guarantee: One-way salted hash rate limit; zero worker ID stored.
 */

const express = require('express');
const router = express.Router();
const { FeedbackService } = require('../services/feedbackService');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateBody, feedbackSchema } = require('../middleware/validation');

const feedbackService = new FeedbackService();

/**
 * POST /api/feedback/anonymous
 * Submit anonymous feedback
 */
router.post('/anonymous', requireAuth, validateBody(feedbackSchema), async (req, res, next) => {
  try {
    const result = await feedbackService.submitFeedback({
      workerId: req.user.id, // Used ONLY to compute one-way rate token; NOT stored in record
      industry: req.user.industry,
      department: req.user.department,
      category: req.body.category,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/feedback/insights
 * Employer dashboard aggregated themes with k-anonymity privacy protection
 */
router.get('/insights', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const industry = req.user.industry;
    const insights = await feedbackService.getAggregatedInsights(industry);
    res.json(insights);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
