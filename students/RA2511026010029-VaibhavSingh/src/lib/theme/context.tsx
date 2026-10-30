'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'obsidian' | 'droplets' | 'sketch' | 'concrete';

export interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  skyEffects: 'auto' | 'reduced' | 'off';
  setSkyEffects: (effects: 'auto' | 'reduced' | 'off') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'obsidian',
  setTheme: () => {},
  skyEffects: 'auto',
  setSkyEffects: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('obsidian');
  const [skyEffects, setSkyEffectsState] = useState<'auto' | 'reduced' | 'off'>('auto');

  useEffect(() => {
    // Read saved theme from localStorage
    const savedTheme = localStorage.getItem('fairshift_theme') as AppTheme;
    if (savedTheme && ['obsidian', 'droplets', 'sketch', 'concrete'].includes(savedTheme)) {
      setThemeState(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'obsidian');
    }

    const savedSky = localStorage.getItem('fairshift_sky_effects') as 'auto' | 'reduced' | 'off';
    if (savedSky && ['auto', 'reduced', 'off'].includes(savedSky)) {
      setSkyEffectsState(savedSky);
    }
  }, []);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fairshift_theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  const setSkyEffects = (effects: 'auto' | 'reduced' | 'off') => {
    setSkyEffectsState(effects);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fairshift_sky_effects', effects);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, skyEffects, setSkyEffects }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
