import { describe, it, expect } from 'vitest';
import { getSkyState } from '@/core/sky';

describe('Sky Layer Core Logic', () => {
  const sunrise = '06:00';
  const sunset = '18:15';

  it('08:00 clear gives intensity about 0.6 to 0.8', () => {
    const state = getSkyState({
      now: '08:00',
      sunrise,
      sunset,
      weatherCode: 0,
      cloudCover: 0,
    });

    expect(state.body).toBe('sun');
    expect(state.intensity).toBeGreaterThanOrEqual(0.6);
    expect(state.intensity).toBeLessThanOrEqual(0.85);
  });

  it('13:00 gives 1.0 maximum intensity', () => {
    const state = getSkyState({
      now: '13:00',
      sunrise,
      sunset,
      weatherCode: 0,
      cloudCover: 0,
    });

    expect(state.body).toBe('sun');
    expect(state.intensity).toBe(1.0);
  });

  it('17:45 with sunset 18:15 gives a warm value below 0.5', () => {
    const state = getSkyState({
      now: '17:45',
      sunrise,
      sunset,
      weatherCode: 0,
      cloudCover: 0,
    });

    expect(state.body).toBe('sun');
    expect(state.intensity).toBeLessThan(0.5);
    expect(state.warmth).toBeGreaterThan(0.6); // Warm golden hour
  });

  it('21:00 gives the moon and lunar phase', () => {
    const state = getSkyState({
      now: '2026-10-20T21:00:00Z',
      sunrise,
      sunset,
      weatherCode: 0,
      cloudCover: 10,
    });

    expect(state.body).toBe('moon');
    expect(state.isDay).toBe(false);
    expect(state.moonPhase).toBeGreaterThanOrEqual(0.0);
    expect(state.moonPhase).toBeLessThanOrEqual(1.0);
    expect(state.moonPhaseName).toBeDefined();
  });

  it('weather_code 61 gives light rain', () => {
    const state = getSkyState({
      now: '14:00',
      sunrise,
      sunset,
      weatherCode: 61, // Rain
      cloudCover: 80,
    });

    expect(state.rain).toBe('light');
  });

  it('cloud cover attenuates sun intensity', () => {
    const clearState = getSkyState({
      now: '13:00',
      sunrise,
      sunset,
      weatherCode: 0,
      cloudCover: 0,
    });
    const cloudyState = getSkyState({
      now: '13:00',
      sunrise,
      sunset,
      weatherCode: 0,
      cloudCover: 100, // 50% attenuation
    });

    expect(cloudyState.intensity).toBeLessThan(clearState.intensity);
    expect(cloudyState.intensity).toBe(0.5);
  });
});
