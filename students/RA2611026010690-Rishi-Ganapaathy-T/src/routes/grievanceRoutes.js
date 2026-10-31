/**
 * Grievance & Hazard Reporting Routes
 * Multi-channel submission and transparent 4-stage status tracking.
 */

const express = require('express');
const router = express.Router();
const { GrievanceService } = require('../services/grievanceService');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateBody, grievanceSchema, grievanceStatusSchema } = require('../middleware/validation');

const grievanceService = new GrievanceService();

/**
 * POST /api/grievances
 * Submit a grievance or hazard report
 */
router.post('/', requireAuth, validateBody(grievanceSchema), async (req, res, next) => {
  try {
    const grievance = await grievanceService.submitGrievance({
      workerId: req.user.id,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      severity: req.body.severity,
      photoUrl: req.body.photoUrl,
      voiceInputUsed: req.body.voiceInputUsed,
    });
    res.status(201).json({
      message: 'Safety / Grievance report submitted successfully.',
      grievance,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/grievances
 * List grievances (worker sees their own, admin sees all for their industry)
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const list = await grievanceService.listGrievances(req.user, filter);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/grievances/:id
 * Retrieve single grievance record with replies
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const record = await grievanceService.getGrievanceById(req.params.id, req.user);
    res.json(record);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/grievances/:id/status
 * Admin updates status and provides official administrative reply
 */
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('admin'),
  validateBody(grievanceStatusSchema),
  async (req, res, next) => {
    try {
      const updated = await grievanceService.updateStatus(
        req.params.id,
        req.body.status,
        req.user,
        req.body.replyMessage
      );
      res.json({
        message: 'Grievance status updated.',
        grievance: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

