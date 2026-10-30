'use client';

import React from 'react';
import { useTheme, AppTheme } from '@/lib/theme/context';
import { Palette } from 'lucide-react';

const THEME_OPTIONS: Array<{ id: AppTheme; label: string; icon: string }> = [
  { id: 'obsidian', label: 'Obsidian Glass (Dark)', icon: '🌑' },
  { id: 'droplets', label: 'Lime Droplets (Water)', icon: '💧' },
  { id: 'sketch', label: 'Sketch Mono (Paper)', icon: '✏️' },
  { id: 'concrete', label: 'Concrete Day (Light)', icon: '☀️' },
];

export function ThemeSwitcher({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`inline-flex items-center gap-1.5 p-1 rounded-xl bg-grey-900 border border-grey-700 ${className}`}>
      <Palette className="w-4 h-4 text-grey-300 ms-1.5 shrink-0" aria-hidden="true" />
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as AppTheme)}
        aria-label="Change color theme"
        className="bg-transparent text-text text-sm font-bold py-1 px-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime cursor-pointer"
      >
        {THEME_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id} className="bg-obsidian text-text py-1">
            {opt.icon} {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
