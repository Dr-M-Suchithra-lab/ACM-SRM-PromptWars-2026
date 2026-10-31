/**
 * Unit Tests: Shift Hours & Overtime Calculations
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calculateShiftHours, calculateDistanceMeters } = require('../src/services/attendanceService');

describe('Shift Hours & Overtime Math', () => {
  it('correctly calculates regular hours with zero overtime for standard 8h shift', () => {
    const inTime = '2026-10-20T08:00:00.000Z';
    const outTime = '2026-10-20T16:00:00.000Z';
    const result = calculateShiftHours(inTime, outTime, 8);

    assert.equal(result.totalHours, 8.0);
    assert.equal(result.regularHours, 8.0);
    assert.equal(result.overtimeHours, 0.0);
  });

  it('correctly allocates 8 regular hours and 2.5 overtime hours for 10.5h shift', () => {
    const inTime = '2026-10-20T07:00:00.000Z';
    const outTime = '2026-10-20T17:30:00.000Z';
    const result = calculateShiftHours(inTime, outTime, 8);

    assert.equal(result.totalHours, 10.5);
    assert.equal(result.regularHours, 8.0);
    assert.equal(result.overtimeHours, 2.5);
  });

  it('correctly handles partial shifts under standard hours', () => {
    const inTime = '2026-10-20T09:00:00.000Z';
    const outTime = '2026-10-20T14:30:00.000Z';
    const result = calculateShiftHours(inTime, outTime, 8);

    assert.equal(result.totalHours, 5.5);
    assert.equal(result.regularHours, 5.5);
    assert.equal(result.overtimeHours, 0.0);
  });

  it('throws descriptive error on invalid or negative shift intervals', () => {
    assert.throws(
      () => calculateShiftHours('2026-10-20T17:00:00.000Z', '2026-10-20T08:00:00.000Z', 8),
      /Invalid check-in or check-out timestamp/
    );
  });
});

describe('Geofence Distance Calculation', () => {
  it('returns zero distance for identical coordinates', () => {
    const dist = calculateDistanceMeters(13.0827, 80.2707, 13.0827, 80.2707);
    assert.equal(Math.round(dist), 0);
  });

  it('accurately verifies proximity within a 350-meter site geofence', () => {
    // Offset by roughly ~100 meters
    const siteLat = 13.0827;
    const siteLon = 80.2707;
    const workerLat = 13.0835;
    const workerLon = 80.2707;
    const distance = calculateDistanceMeters(siteLat, siteLon, workerLat, workerLon);

    assert.ok(distance < 350, `Expected distance < 350m, got ${distance}`);
  });
});

