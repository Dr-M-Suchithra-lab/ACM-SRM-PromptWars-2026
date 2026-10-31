/**
 * Employer Dashboard Analytics Routes
 * Aggregates workforce attendance, overtime trends, open complaints, and anonymous feedback themes.
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { getRepository } = require('../repos');
const { FeedbackService } = require('../services/feedbackService');

const feedbackService = new FeedbackService();

/**
 * GET /api/analytics/dashboard
 * Unified operational overview for supervisors & management
 */
router.get('/dashboard', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const industry = req.user.industry;
    const repo = getRepository();

    const [shifts, grievances, feedbackInsights] = await Promise.all([
      repo.listShiftsByIndustry(industry),
      repo.listGrievances({ industry }),
      feedbackService.getAggregatedInsights(industry),
    ]);

    const completedShifts = shifts.filter((s) => s.status === 'completed');
    const totalHoursLogged = completedShifts.reduce((s, sh) => s + (sh.totalHours || 0), 0);
    const totalOtHours = completedShifts.reduce((s, sh) => s + (sh.overtimeHours || 0), 0);

    const openGrievances = grievances
      .filter((g) => g.status !== 'Resolved')
      .map((g) => {
        const copy = { ...g, workerName: 'Anonymous Worker' };
        delete copy.workerId;
        return copy;
      });
    const criticalGrievances = openGrievances.filter((g) => g.severity === 'critical' || g.severity === 'high');

    res.json({
      industry,
      workforceSummary: {
        totalShiftsRecorded: completedShifts.length,
        totalHoursLogged: Math.round(totalHoursLogged * 10) / 10,
        totalOtHours: Math.round(totalOtHours * 10) / 10,
        openGrievanceCount: openGrievances.length,
        criticalGrievanceCount: criticalGrievances.length,
        feedbackTotal: feedbackInsights.totalResponses,
        feedbackAverageRating: feedbackInsights.averageRating,
      },
      attendanceTrends: {
        totalCompleted: completedShifts.length,
        recentShifts: completedShifts.slice(0, 10),
      },
      openGrievances: openGrievances.slice(0, 10),
      feedbackInsights,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
