import { describe, it, expect } from 'vitest';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function getRelativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hexToRgb(hex1));
  const lum2 = getRelativeLuminance(hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

describe('Theme WCAG AA and Enhanced Contrast Compliance', () => {
  const themes = {
    obsidian: {
      bg: '#0A0B0A',
      surface: '#101310',
      text: '#F2F5F1',
      lime: '#A3E635',
      textOnLime: '#0A0B0A',
      danger: '#FF5A4F',
    },
    droplets: {
      bg: '#080E08',
      surface: '#0F1A0F',
      text: '#F2F5F1',
      lime: '#A3E635',
      textOnLime: '#0A0B0A',
    },
    sketch: {
      bg: '#FAFAFA',
      surface: '#FFFFFF',
      text: '#111827',
      lime: '#A3E635',
      textOnLime: '#0A0B0A',
    },
    concrete: {
      bg: '#E5E7EB',
      surface: '#F3F4F6',
      text: '#0F172A',
      lime: '#4D7C0F', // deep lime on light theme
      textOnLime: '#FFFFFF',
    },
  };

  it('fails if worker body text in obsidian theme is below 7:1 ratio', () => {
    const ratio = getContrastRatio(themes.obsidian.text, themes.obsidian.bg);
    expect(ratio).toBeGreaterThanOrEqual(7.0);
  });

  it('fails if text on primary lime button is below 4.5:1 ratio', () => {
    const ratio = getContrastRatio(themes.obsidian.textOnLime, themes.obsidian.lime);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  for (const [themeName, theme] of Object.entries(themes)) {
    it(`verifies main text contrast in theme "${themeName}" exceeds WCAG AA 4.5:1`, () => {
      const ratio = getContrastRatio(theme.text, theme.bg);
      expect(ratio, `Main text contrast in ${themeName}`).toBeGreaterThanOrEqual(4.5);
    });

    it(`verifies text on lime contrast in theme "${themeName}" exceeds WCAG AA 4.5:1`, () => {
      const ratio = getContrastRatio(theme.textOnLime, theme.lime);
      expect(ratio, `Text on lime button contrast in ${themeName}`).toBeGreaterThanOrEqual(4.5);
    });
  }
});
