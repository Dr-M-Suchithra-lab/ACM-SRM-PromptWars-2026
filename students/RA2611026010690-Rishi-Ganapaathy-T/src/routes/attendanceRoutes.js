/**
 * Attendance & Shift Tracking Routes
 * Handles QR-code & Geofence check-in/out and shift summaries.
 */

const express = require('express');
const router = express.Router();
const { AttendanceService } = require('../services/attendanceService');
const { requireAuth } = require('../middleware/auth');
const { validateBody, checkInSchema } = require('../middleware/validation');

const attendanceService = new AttendanceService();

/**
 * POST /api/attendance/check-in
 * Worker check-in with QR code or Geofence
 */
router.post('/check-in', requireAuth, validateBody(checkInSchema), async (req, res, next) => {
  try {
    const shift = await attendanceService.checkIn({
      workerId: req.user.id,
      shiftId: req.body.shiftId,
      siteCode: req.body.siteCode,
      coordinates: req.body.coordinates,
    });
    res.status(201).json({
      message: 'Check-in recorded successfully.',
      shift,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/attendance/check-out
 * Worker check-out and automated overtime calculation
 */
router.post('/check-out', requireAuth, async (req, res, next) => {
  try {
    const shift = await attendanceService.checkOut(req.user.id);
    res.json({
      message: 'Check-out recorded successfully.',
      shift,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/attendance/summary
 * Attendance history and overtime breakdown
 */
router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const summary = await attendanceService.getWorkerAttendanceSummary(req.user.id);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/attendance/active
 * Return currently active shift if checked in
 */
router.get('/active', requireAuth, async (req, res, next) => {
  try {
    const active = await attendanceService.repo.getActiveShift(req.user.id);
    res.json({ activeShift: active });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

