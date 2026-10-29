'use client';

import React, { useEffect, useState } from 'react';
import { getSkyState, SkyState } from '@/core/sky';
import { useTheme } from '@/lib/theme/context';
import { SECTORS, DEFAULT_SECTOR_ID } from '@/config/sectors';

interface WeatherCache {
  timestamp: number;
  temperature: number;
  relativeHumidity: number;
  weatherCode: number;
  cloudCover: number;
  sunrise: string;
  sunset: string;
}

export function SkyLayer() {
  const { theme, skyEffects } = useTheme();
  const [sky, setSky] = useState<SkyState | null>(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    // Check reduced motion / save data / low memory
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isSaveData = (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const isLowMem = (navigator as unknown as { deviceMemory?: number }).deviceMemory !== undefined && (navigator as unknown as { deviceMemory?: number }).deviceMemory! <= 2;

    setIsReducedMotion(mediaQuery.matches || isSaveData || isLowMem || skyEffects === 'reduced');

    const updateWeatherAndSky = async () => {
      if (skyEffects === 'off') {
        setSky(null);
        return;
      }

      const defaultCoords = SECTORS[DEFAULT_SECTOR_ID].defaultCoordinates;
      let lat = defaultCoords.lat;
      let lon = defaultCoords.lon;

      // Check user location preference
      const customLoc = localStorage.getItem('fairshift_custom_location');
      if (customLoc) {
        try {
          const parsed = JSON.parse(customLoc);
          lat = Number(parsed.lat.toFixed(2));
          lon = Number(parsed.lon.toFixed(2));
        } catch (e) {}
      }

      // Check cache in localStorage (30 min TTL)
      const cacheKey = `fairshift_weather_${lat}_${lon}`;
      const cached = localStorage.getItem(cacheKey);
      let weatherData: WeatherCache | null = null;

      if (cached) {
        try {
          const parsed: WeatherCache = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
            weatherData = parsed;
          }
        } catch (e) {}
      }

      if (!weatherData) {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,cloud_cover,is_day&daily=sunrise,sunset&timezone=auto`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (res.ok) {
            const json = await res.json();
            weatherData = {
              timestamp: Date.now(),
              temperature: json.current?.temperature_2m ?? 32,
              relativeHumidity: json.current?.relative_humidity_2m ?? 65,
              weatherCode: json.current?.weather_code ?? 0,
              cloudCover: json.current?.cloud_cover ?? 10,
              sunrise: json.daily?.sunrise?.[0] ? json.daily.sunrise[0].slice(11, 16) : '06:00',
              sunset: json.daily?.sunset?.[0] ? json.daily.sunset[0].slice(11, 16) : '18:00',
            };
            localStorage.setItem(cacheKey, JSON.stringify(weatherData));
          }
        } catch (err) {
          // Offline fallback
        }
      }

      const now = new Date();
      const state = getSkyState({
        now,
        sunrise: weatherData?.sunrise || '06:00',
        sunset: weatherData?.sunset || '18:00',
        weatherCode: weatherData?.weatherCode || 0,
        cloudCover: weatherData?.cloudCover || 10,
      });

      setSky(state);
    };

    updateWeatherAndSky();
    // Update once a minute (never per frame)
    const interval = setInterval(updateWeatherAndSky, 60000);
    return () => clearInterval(interval);
  }, [skyEffects]);

  if (skyEffects === 'off' || !sky) return null;

  const glowCap = theme === 'concrete' ? 0.18 : 0.28;
  const isSketch = theme === 'sketch';

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 start-0 w-full h-[38vh] z-0 pointer-events-none select-none overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
      }}
    >
      {/* Sky background tint */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: Math.min(sky.intensity, glowCap),
          background: sky.isDay
            ? `radial-gradient(ellipse at ${sky.arcX}% ${100 - sky.arcY}%, rgba(163, 230, 53, ${sky.warmth}), transparent 70%)`
            : 'radial-gradient(ellipse at 50% 20%, rgba(148, 163, 184, 0.15), transparent 70%)',
        }}
      />

      {/* Sun / Moon celestial body */}
      <div
        className="absolute transition-all duration-1000"
        style={{
          left: `${sky.arcX}%`,
          top: `${Math.max(10, 100 - sky.arcY * 0.8)}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {isSketch ? (
          // Sketch line-art representation
          <svg className="w-14 h-14 text-black" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
            {sky.body === 'sun' ? (
              <>
                <circle cx="50" cy="50" r="22" />
                <path d="M50 15v10M50 75v10M15 50h10M75 50h10M25 25l7 7M68 68l7 7M25 75l7-7M68 32l7-7" />
              </>
            ) : (
              <path d="M50 20 A30 30 0 1 0 80 60 A25 25 0 0 1 50 20 Z" />
            )}
          </svg>
        ) : sky.body === 'sun' ? (
          // Radiant Sun
          <div className="relative flex items-center justify-center">
            <div
              className="w-16 h-16 rounded-full"
              style={{
                background: 'radial-gradient(circle, #FDE047 30%, #A3E635 80%)',
                boxShadow: `0 0 35px 12px rgba(163, 230, 53, ${Math.min(glowCap, sky.intensity * 0.4)})`,
              }}
            />
          </div>
        ) : (
          // Real Lunar Phase Moon
          <div className="relative flex items-center justify-center">
            <div
              className="w-12 h-12 rounded-full border border-slate-400/40 relative overflow-hidden"
              style={{
                background: '#E2E8F0',
                boxShadow: '0 0 20px 4px rgba(226, 232, 240, 0.25)',
              }}
            >
              <div
                className="absolute inset-0 bg-black/70"
                style={{
                  clipPath: `inset(0 ${sky.moonPhase < 0.5 ? (1 - sky.moonPhase * 2) * 100 : 0}% 0 0)`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Static Stars when night and clear */}
      {!sky.isDay && sky.intensity > 0.1 && (
        <div className="absolute inset-0 opacity-40">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                top: `${(i * 19) % 35}%`,
                left: `${(i * 37) % 96}%`,
                opacity: (i % 5) * 0.15 + 0.2,
              }}
            />
          ))}
        </div>
      )}

      {/* Light rain: max 30 thin drops, opacity 0.25, in sky area only */}
      {sky.rain === 'light' && !isReducedMotion && (
        <div className="absolute inset-0 pointer-events-none opacity-25">
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className="absolute w-[1.5px] h-4 bg-sky-300 rounded-full animate-rain-drop"
              style={{
                top: `${(i * 13) % 80}%`,
                left: `${(i * 29) % 100}%`,
                animationDuration: `${0.8 + (i % 5) * 0.1}s`,
                animationDelay: `${(i % 10) * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
