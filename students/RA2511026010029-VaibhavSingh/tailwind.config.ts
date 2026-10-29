import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="obsidian"]'],
  theme: {
    extend: {
      colors: {
        black: 'var(--color-black)',
        obsidian: 'var(--color-obsidian)',
        'grey-900': 'var(--color-grey-900)',
        'grey-700': 'var(--color-grey-700)',
        'grey-500': 'var(--color-grey-500)',
        'grey-300': 'var(--color-grey-300)',
        text: 'var(--color-text)',
        lime: 'var(--color-lime)',
        'lime-deep': 'var(--color-lime-deep)',
        danger: 'var(--color-danger)',
        warn: 'var(--color-warn)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        sketch: ['var(--font-sketch)', 'Patrick Hand', 'cursive', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
