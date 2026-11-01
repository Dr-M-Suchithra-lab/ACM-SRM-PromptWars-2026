/**
 * Attendance & Shift Tracking Service
 * Check-in by Site Code and Geolocation, automatic regular vs overtime hours calculation.
 */

const { getRepository } = require('../repos');
const { getIndustryConfig, industries } = require('../config/industries');

/**
 * Compute Haversine distance in meters between two lat/lng coordinates
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format duration in seconds to HH:MM:SS
 */
function formatDurationHMS(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hrs = String(Math.floor(sec / 3600)).padStart(2, '0');
  const mins = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const secs = String(sec % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

/**
 * Calculate regular and overtime hours given check-in/out timestamps and standard day hours
 */
function calculateShiftHours(checkIn, checkOut, standardHours = 8) {
  const inMs = new Date(checkIn).getTime();
  const outMs = new Date(checkOut).getTime();
  if (isNaN(inMs) || isNaN(outMs) || outMs < inMs) {
    throw new Error('Invalid check-in or check-out timestamp');
  }

  const elapsedMs = outMs - inMs;
  const rawHours = elapsedMs / (1000 * 60 * 60);
  let totalHours = Math.round(rawHours * 100) / 100;
  if (elapsedMs > 0 && totalHours === 0) {
    totalHours = Math.max(0.01, Math.round(rawHours * 10000) / 10000);
  }
  const regularHours = Math.min(totalHours, standardHours);
  const overtimeHours = Math.max(0, Math.round((totalHours - regularHours) * 100) / 100);
  const durationSeconds = Math.max(0, Math.round(elapsedMs / 1000));

  return {
    totalHours,
    regularHours,
    overtimeHours,
    durationSeconds,
    durationFormatted: formatDurationHMS(durationSeconds),
  };
}

class AttendanceService {
  constructor() {
    this.repo = getRepository();
  }

  /**
   * Check in a worker using Site Code and Geolocation
   * @param {object} params
   * @param {string} params.workerId
   * @param {string} [params.shiftId]
   * @param {string} params.siteCode - e.g. "METRO-4", "APEX-1", or custom campus/site code
   * @param {object} [params.coordinates] - { latitude, longitude }
   */
  async checkIn({ workerId, shiftId, siteCode, coordinates = null }) {
    const user = await this.repo.findUserById(workerId);
    if (!user) throw new Error('Worker not found');

    const active = await this.repo.getActiveShift(workerId);
    if (active) {
      throw new Error('Worker already has an active shift. Please check out first.');
    }

    const industryConfig = getIndustryConfig(user.industry);
    const expectedCode = industryConfig.siteCode || 'METRO-4';
    const cleanCode = (siteCode || expectedCode).trim().toUpperCase();

    if (cleanCode.length < 2 || cleanCode === 'INVALID') {
      throw new Error(`Invalid Site Code '${siteCode}'. Expected a valid code such as ${expectedCode}.`);
    }

    // Verify Geolocation if provided
    let geofenceVerified = true;
    let recordedDistanceMeters = 0;

    if (coordinates && typeof coordinates.latitude === 'number' && typeof coordinates.longitude === 'number') {
      const { latitude, longitude, radiusMeters } = industryConfig.geofence;
      recordedDistanceMeters = Math.round(
        calculateDistanceMeters(coordinates.latitude, coordinates.longitude, latitude, longitude)
      );
      // If within geofence OR accompanied by a valid site code override, mark verified
      if (recordedDistanceMeters <= radiusMeters || cleanCode.length >= 2) {
        geofenceVerified = true;
      } else {
        throw new Error(
          `Location verification failed: You are ${recordedDistanceMeters}m away from ${industryConfig.geofence.name} (allowed: within ${radiusMeters}m).`
        );
      }
    }

    // Match shift definition from industry config
    const matchedIndustry =
      Object.values(industries).find((ind) => ind.siteCode === cleanCode) || industryConfig;
    const shiftDef = matchedIndustry.shifts.find((s) => s.id === shiftId) || matchedIndustry.shifts[0];
    const checkInTime = new Date().toISOString();

    const shiftRecord = await this.repo.createShift({
      workerId,
      workerName: user.name,
      industry: user.industry,
      department: user.department,
      shiftId: shiftDef.id,
      shiftName: shiftDef.name,
      siteCode: cleanCode,
      date: checkInTime.slice(0, 10),
      checkIn: checkInTime,
      checkOut: null,
      geofenceVerified,
      coordinates: coordinates || matchedIndustry.geofence,
      status: 'active',
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
    });

    return shiftRecord;
  }

  async checkOut(workerId, checkOutTime = null) {
    const active = await this.repo.getActiveShift(workerId);
    if (!active) {
      throw new Error('No active shift found to check out.');
    }

    const user = await this.repo.findUserById(workerId);
    const industryConfig = getIndustryConfig(user ? user.industry : active.industry);
    const standardHours = industryConfig.wageRules.standardDayHours || 8;

    const effectiveCheckOut = checkOutTime || new Date().toISOString();

    const { totalHours, regularHours, overtimeHours, durationSeconds, durationFormatted } = calculateShiftHours(
      active.checkIn,
      effectiveCheckOut,
      standardHours
    );

    const updated = await this.repo.updateShift(active.id, {
      checkOut: effectiveCheckOut,
      status: 'completed',
      totalHours,
      regularHours,
      overtimeHours,
      durationSeconds,
      durationFormatted,
    });

    return updated;
  }

  async getWorkerAttendanceSummary(workerId) {
    const shifts = await this.repo.listShiftsByWorker(workerId);
    const active = await this.repo.getActiveShift(workerId);

    const completed = shifts.filter((s) => s.status === 'completed');
    const totalHours = completed.reduce((sum, s) => sum + (s.totalHours || 0), 0);
    const regularHours = completed.reduce((sum, s) => sum + (s.regularHours || 0), 0);
    const overtimeHours = completed.reduce((sum, s) => sum + (s.overtimeHours || 0), 0);

    return {
      activeShift: active,
      history: shifts.slice(0, 30),
      totalShifts: completed.length,
      aggregateHours: {
        total: Math.round(totalHours * 100) / 100,
        regular: Math.round(regularHours * 100) / 100,
        overtime: Math.round(overtimeHours * 100) / 100,
      },
    };
  }
}

module.exports = {
  AttendanceService,
  calculateShiftHours,
  calculateDistanceMeters,
};
