import type { Metadata, Viewport } from "next";
import { Anek_Devanagari, Anek_Latin, Anek_Tamil, Anek_Telugu, Bricolage_Grotesque } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { SerwistProvider } from "@serwist/turbopack/react";
import { Toaster } from "sonner";
import { NavigationProvider } from "@/components/providers/navigation-provider";
import { MotionPolicy } from "@/components/providers/motion-policy";
import "./globals.css";

/*
 * Anek is one multi-script family, so English, Hindi, Tamil and Telugu look like one brand.
 * Self-hosted at build time (no runtime call to Google), so CSP keeps font-src 'self'.
 * Only Latin is preloaded; an Indic face downloads only when that script is on screen.
 */
const anekLatin = Anek_Latin({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-anek-latin" });
const anekDevanagari = Anek_Devanagari({
  subsets: ["devanagari"],
  display: "swap",
  preload: false,
  variable: "--font-anek-devanagari",
});
const anekTamil = Anek_Tamil({ subsets: ["tamil"], display: "swap", preload: false, variable: "--font-anek-tamil" });
const anekTelugu = Anek_Telugu({
  subsets: ["telugu"],
  display: "swap",
  preload: false,
  variable: "--font-anek-telugu",
});
// Display face for headings and the wordmark (latin-ext carries the dotless ı of "Faır").
const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-bricolage",
});

const SCRIPT_FONT: Record<string, { className: string; cssVar: string }> = {
  en: { className: "", cssVar: "--font-anek-latin" },
  hi: { className: anekDevanagari.variable, cssVar: "--font-anek-devanagari" },
  ta: { className: anekTamil.variable, cssVar: "--font-anek-tamil" },
  te: { className: anekTelugu.variable, cssVar: "--font-anek-telugu" },
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return {
    title: { default: "FairShift", template: "%s · FairShift" },
    description: t("subtitle"),
    applicationName: "FairShift",
  };
}

export const viewport: Viewport = {
  themeColor: "#fbf8f3",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  // Lets env(safe-area-inset-*) keep the tab bar clear of Android gesture bars and notches.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const t = await getTranslations("common");
  const font = SCRIPT_FONT[locale] ?? SCRIPT_FONT.en;

  return (
    <html lang={locale} className={`${anekLatin.variable} ${font.className} ${bricolage.variable} h-full`}>
      <body
        className="flex min-h-full flex-col font-sans"
        style={{ ["--font-active" as string]: `var(${font.cssVar}), var(--font-anek-latin)` }}
      >
        <a href="#main" className="skip-link">
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === "development"}>
            <NavigationProvider>{children}</NavigationProvider>
          </SerwistProvider>
        </NextIntlClientProvider>
        <MotionPolicy />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
