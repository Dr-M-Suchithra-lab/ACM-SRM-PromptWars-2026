export interface SkyStateInput {
  now: string | Date;
  sunrise: string | Date;
  sunset: string | Date;
  weatherCode: number;
  cloudCover: number; // 0 to 100
}

export interface SkyState {
  body: 'sun' | 'moon';
  arcX: number; // 0 to 100% horizontal position
  arcY: number; // 0 to 100% vertical position (100 is zenith)
  intensity: number; // 0.0 to 1.0
  warmth: number; // 0.0 (cool/midday) to 1.0 (golden dawn/dusk)
  rain: 'none' | 'light';
  moonPhase: number; // 0.0 (new moon) to 1.0 (full moon is ~0.5)
  moonPhaseName: string;
  isDay: boolean;
}

const SYNODIC_MONTH = 29.53058867;
const KNOWN_NEW_MOON_MS = new Date('2000-01-06T18:14:00Z').getTime();

function parseToMinutes(time: string | Date): number {
  if (time instanceof Date) {
    return time.getHours() * 60 + time.getMinutes();
  }
  if (time.includes('T')) {
    const d = new Date(time);
    return d.getHours() * 60 + d.getMinutes();
  }
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Calculates accurate lunar phase based on synodic month cycle.
 */
export function getMoonPhase(nowDate: Date): { phase: number; name: string } {
  const diffDays = (nowDate.getTime() - KNOWN_NEW_MOON_MS) / (1000 * 60 * 60 * 24);
  const phase = ((diffDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const normalized = phase / SYNODIC_MONTH;

  let name = 'New Moon';
  if (normalized < 0.03 || normalized > 0.97) name = 'New Moon';
  else if (normalized < 0.22) name = 'Waxing Crescent';
  else if (normalized < 0.28) name = 'First Quarter';
  else if (normalized < 0.47) name = 'Waxing Gibbous';
  else if (normalized < 0.53) name = 'Full Moon';
  else if (normalized < 0.72) name = 'Waning Gibbous';
  else if (normalized < 0.78) name = 'Last Quarter';
  else name = 'Waning Crescent';

  return { phase: Number(normalized.toFixed(3)), name };
}

/**
 * Pure function getSkyState
 */
export function getSkyState(input: SkyStateInput): SkyState {
  const nowDate = typeof input.now === 'string' ? new Date(input.now) : input.now;
  const nowMin = parseToMinutes(input.now);
  const sunriseMin = parseToMinutes(input.sunrise);
  const sunsetMin = parseToMinutes(input.sunset);

  const isDay = nowMin >= sunriseMin && nowMin < sunsetMin;

  // Rain evaluation: codes 51-67, 80-82, 95-99
  const isRain =
    (input.weatherCode >= 51 && input.weatherCode <= 67) ||
    (input.weatherCode >= 80 && input.weatherCode <= 82) ||
    (input.weatherCode >= 95 && input.weatherCode <= 99);
  const rain: 'none' | 'light' = isRain ? 'light' : 'none';

  const { phase: moonPhase, name: moonPhaseName } = getMoonPhase(nowDate);

  let body: 'sun' | 'moon' = 'sun';
  let arcX = 50;
  let arcY = 50;
  let baseIntensity = 0.5;
  let warmth = 0.2;

  if (isDay) {
    body = 'sun';
    const dayProgress = (nowMin - sunriseMin) / (sunsetMin - sunriseMin);
    arcX = Math.round(dayProgress * 100);
    // Parabolic arc for height: sin(dayProgress * PI)
    arcY = Math.round(Math.sin(dayProgress * Math.PI) * 100);

    const dawnEnd = sunriseMin + 60;
    const noonStart = 12 * 60;
    const afternoonEnd = 15 * 60;
    const duskStart = sunsetMin - 60;

    if (nowMin < dawnEnd) {
      // Dawn (sunrise to +1h): ramps 0.2 to 0.4
      const p = (nowMin - sunriseMin) / 60;
      baseIntensity = 0.2 + p * 0.2;
      warmth = 0.85 - p * 0.2;
    } else if (nowMin < noonStart) {
      // Morning (dawnEnd to 12:00): ramps 0.4 to 0.8 up to mid-morning, then to 1.0 at noon
      // At 08:00 (1 hour after dawnEnd 07:00), intensity is ~0.65-0.70
      const morningProgress = (nowMin - dawnEnd) / (noonStart - dawnEnd);
      // Ramps swiftly in early morning to 0.7 by 08:00, reaching 0.8+ before noon
      baseIntensity = 0.4 + Math.pow(morningProgress, 0.45) * 0.6;
      warmth = 0.65 - morningProgress * 0.45;
    } else if (nowMin <= afternoonEnd) {
      // Afternoon (12:00 to 15:00): 1.0
      baseIntensity = 1.0;
      warmth = 0.15;
    } else if (nowMin < duskStart) {
      // Late afternoon: ramps down to 0.6
      const p = (nowMin - afternoonEnd) / (duskStart - afternoonEnd);
      baseIntensity = 1.0 - p * 0.4;
      warmth = 0.2 + p * 0.4;
    } else {
      // Evening (last hour before sunset): dim and warm orange, 0.35
      const p = (nowMin - duskStart) / 60;
      baseIntensity = 0.6 - p * 0.25; // 0.6 down to 0.35
      warmth = 0.6 + p * 0.35; // warm orange
    }
  } else {
    // Night: Moon
    body = 'moon';
    baseIntensity = 0.25;
    warmth = 0.05; // Cool silver/blue

    // Calculate night progress
    let nightProgress = 0.5;
    if (nowMin >= sunsetMin) {
      const nightDuration = 24 * 60 - sunsetMin + sunriseMin;
      nightProgress = (nowMin - sunsetMin) / nightDuration;
    } else {
      const nightDuration = 24 * 60 - sunsetMin + sunriseMin;
      nightProgress = (24 * 60 - sunsetMin + nowMin) / nightDuration;
    }
    arcX = Math.round(nightProgress * 100);
    arcY = Math.round(Math.sin(nightProgress * Math.PI) * 80) + 10;
  }

  // Cloud cover attenuation: multiply intensity by (1 - 0.5 * cloudCover / 100)
  const cloudFactor = 1 - 0.5 * (Math.min(100, Math.max(0, input.cloudCover)) / 100);
  const finalIntensity = Number((baseIntensity * cloudFactor).toFixed(2));

  return {
    body,
    arcX,
    arcY,
    intensity: finalIntensity,
    warmth: Number(warmth.toFixed(2)),
    rain,
    moonPhase,
    moonPhaseName,
    isDay,
  };
}
