export type HeatLevel = 'SAFE' | 'CAUTION' | 'EXTREME_CAUTION' | 'DANGER' | 'EXTREME_DANGER';

export interface HeatAssessment {
  temperatureC: number;
  relativeHumidity: number;
  heatIndexC: number;
  level: HeatLevel;
  restMinutesPerHour: number;
  workMinutesPerHour: number;
  hydrationRecommendation: string;
  actionGuidance: string;
  isOutdoorWorkRestricted: boolean;
}

/**
 * Computes Heat Index from Temperature (°C) and Relative Humidity (%).
 * Based on NOAA / Rothfusz regression adapted for metric.
 */
export function calculateHeatIndex(tempC: number, rh: number): number {
  const T = (tempC * 9) / 5 + 32; // Fahrenheit
  const R = rh;

  // Simple formula if below 80°F (approx 26.7°C)
  if (T < 80) {
    const simpleF = 0.5 * (T + 61.0 + (T - 68.0) * 1.2 + R * 0.094);
    return Number((((simpleF - 32) * 5) / 9).toFixed(1));
  }

  // Full Rothfusz regression equation
  let hi =
    -42.379 +
    2.04901523 * T +
    10.14333127 * R -
    0.22475541 * T * R -
    0.00683783 * T * T -
    0.05481717 * R * R +
    0.00122874 * T * T * R +
    0.00085282 * T * R * R -
    0.00000199 * T * T * R * R;

  // Adjustments
  if (R < 13 && T >= 80 && T <= 112) {
    const adj = ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    hi -= adj;
  } else if (R > 85 && T >= 80 && T <= 87) {
    const adj = ((R - 85) / 10) * ((87 - T) / 5);
    hi += adj;
  }

  const hiC = ((hi - 32) * 5) / 9;
  return Number(hiC.toFixed(1));
}

/**
 * Assesses thermal heat stress and returns statutory work-rest recommendations.
 */
export function assessHeatStress(temperatureC: number, relativeHumidity: number): HeatAssessment {
  const heatIndexC = calculateHeatIndex(temperatureC, relativeHumidity);

  let level: HeatLevel = 'SAFE';
  let restMinutesPerHour = 0;
  let workMinutesPerHour = 60;
  let hydrationRecommendation = 'Drink clean water at regular intervals.';
  let actionGuidance = 'Normal work schedule. Maintain standard safety gear.';
  let isOutdoorWorkRestricted = false;

  if (heatIndexC >= 46) {
    level = 'EXTREME_DANGER';
    restMinutesPerHour = 45;
    workMinutesPerHour = 15;
    hydrationRecommendation = 'Drink 250ml electrolyte/water every 15 minutes. Avoid caffeinated drinks.';
    actionGuidance =
      'Cease strenuous outdoor manual labor under direct sunlight. Shift to shaded or ventilated duties.';
    isOutdoorWorkRestricted = true;
  } else if (heatIndexC >= 39) {
    level = 'DANGER';
    restMinutesPerHour = 30;
    workMinutesPerHour = 30;
    hydrationRecommendation = 'Drink 1 glass of cold water or ORS every 20 minutes.';
    actionGuidance =
      'Mandatory 30-minute shaded rest per hour. Provide chilled drinking water stations and mist fans.';
    isOutdoorWorkRestricted = false;
  } else if (heatIndexC >= 33) {
    level = 'EXTREME_CAUTION';
    restMinutesPerHour = 15;
    workMinutesPerHour = 45;
    hydrationRecommendation = 'Drink 1 glass of water every 30 minutes even if not feeling thirsty.';
    actionGuidance =
      '15 minutes mandatory shaded rest per hour. Monitor workers for heat rash and dizziness.';
    isOutdoorWorkRestricted = false;
  } else if (heatIndexC >= 27) {
    level = 'CAUTION';
    restMinutesPerHour = 10;
    workMinutesPerHour = 50;
    hydrationRecommendation = 'Drink water every 45 minutes.';
    actionGuidance =
      'Ensure covered shade is available during breaks. Check proper ventilation in enclosed workspaces.';
    isOutdoorWorkRestricted = false;
  }

  return {
    temperatureC,
    relativeHumidity,
    heatIndexC,
    level,
    restMinutesPerHour,
    workMinutesPerHour,
    hydrationRecommendation,
    actionGuidance,
    isOutdoorWorkRestricted,
  };
}
