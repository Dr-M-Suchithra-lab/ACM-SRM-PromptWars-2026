import type { Metadata, Viewport } from 'next';
import {
  Plus_Jakarta_Sans,
  Noto_Sans_Devanagari,
  Noto_Sans_Bengali,
  Noto_Sans_Tamil,
  Noto_Sans_Gurmukhi,
  Noto_Nastaliq_Urdu,
  Patrick_Hand,
} from 'next/font/google';
import './globals.css';
import { I18nProvider } from '@/lib/i18n/context';
import { ThemeProvider } from '@/lib/theme/context';
import { ToastProvider } from '@/components/ui/Toast';
import { SkyLayer } from '@/components/SkyLayer';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '600', '700'],
  variable: '--font-hi',
  display: 'swap',
});

const bengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['400', '600', '700'],
  variable: '--font-bn',
  display: 'swap',
});

const tamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  weight: ['400', '600', '700'],
  variable: '--font-ta',
  display: 'swap',
});

const gurmukhi = Noto_Sans_Gurmukhi({
  subsets: ['gurmukhi'],
  weight: ['400', '600', '700'],
  variable: '--font-pa',
  display: 'swap',
});

const nastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-ur',
  display: 'swap',
});

const patrickHand = Patrick_Hand({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-sketch',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FairShift Hisaab | Workplace Fairness Platform',
  description:
    'Two-Key fairness for UN SDG 8: mobile-first worker shift companion and employer command cockpit.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/images/hisaab-logo.jpg',
    apple: '/images/hisaab-logo.jpg',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0B0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      data-theme="obsidian"
      className={`${plusJakartaSans.variable} ${devanagari.variable} ${bengali.variable} ${tamil.variable} ${gurmukhi.variable} ${nastaliqUrdu.variable} ${patrickHand.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased relative min-h-screen">
        {/* SVG filter for Sketch theme hand-drawn wobble */}
        <svg className="hidden" aria-hidden="true">
          <defs>
            <filter id="hand-drawn-wobble">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" />
            </filter>
          </defs>
        </svg>

        {/* Accessible skip link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 z-50 px-4 py-2 bg-lime text-black font-bold rounded-xl shadow-xl"
        >
          Skip to main content
        </a>

        <ThemeProvider>
          <I18nProvider>
            <ToastProvider>
              <SkyLayer />
              <div className="bg-mirror-morph" aria-hidden="true" />
              <div className="bg-mirror-overlay" aria-hidden="true" />
              <div className="relative z-10 flex flex-col min-h-screen">
                {children}
              </div>
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
