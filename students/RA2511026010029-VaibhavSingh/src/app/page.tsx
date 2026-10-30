'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { ReadAloudButton } from '@/components/ui/ReadAloudButton';
import { Modal } from '@/components/ui/Modal';
import { Chip } from '@/components/ui/Chip';
import QRCode from 'qrcode';
import {
  Users,
  ShieldCheck,
  Scale,
  Sparkles,
  QrCode,
  HardHat,
  Stethoscope,
  GraduationCap,
  Briefcase,
  ArrowRight,
} from 'lucide-react';

export default function WelcomePage() {
  const { t } = useI18n();
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedQrRole, setSelectedQrRole] = useState<'worker' | 'contractor' | 'admin'>('worker');
  const [selectedQrSector, setSelectedQrSector] = useState<'srmist' | 'metro' | 'hospital'>('srmist');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrTargetUrl, setQrTargetUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const targetUrl = `${origin}/api/auth/qr-login?sector=${selectedQrSector}&role=${selectedQrRole}`;
      setQrTargetUrl(targetUrl);
      QRCode.toDataURL(targetUrl, {
        width: 240,
        margin: 1,
        color: {
          dark: '#0A0B0A',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR', err));
    }
  }, [selectedQrRole, selectedQrSector]);

  return (
    <main id="main-content" className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full p-4 sm:p-6 space-y-8">
      {/* Top Bar with Language and Theme */}
      <header className="flex items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-2.5">
          <img
            src="/images/hisaab-logo.jpg"
            alt="Hisaab Logo"
            className="w-8 h-8 rounded-xl object-contain bg-white p-0.5 border border-lime/40 shadow-sm"
          />
          <span className="font-extrabold text-xl tracking-tight text-text">FairShift Hisaab</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </header>

      {/* Hero Welcome with Official Hisaab Logo */}
      <div className="text-center space-y-4 pt-2">
        <div className="flex justify-center">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-2 border-lime/50 shadow-2xl bg-white p-1 hover:scale-105 transition-transform duration-300">
            <img
              src="/images/hisaab-logo.jpg"
              alt="Hisaab Logo - Two-Key Fairness for UN SDG 8"
              className="w-full h-full object-contain rounded-2xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text tracking-tight leading-tight">
            FairShift Hisaab
          </h1>
          <p className="text-lg text-grey-300 max-w-md mx-auto leading-relaxed">
            {t('welcome.subtitle')}
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <ReadAloudButton />
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-lime/10 border border-lime text-lime font-bold text-sm hover:bg-lime/20 active:scale-95 transition-all shadow"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan with Phone Camera</span>
          </button>
        </div>
      </div>

      {/* Two Big Standard Wizard Tiles */}
      <div className="space-y-4">
        {/* Tile 1: I work here */}
        <Link
          href="/login/sector"
          className="glass-card min-h-[105px] w-full p-5 flex items-center gap-5 transition-all duration-200 active:scale-[0.98] border-2 border-lime/40 hover:border-lime bg-lime/5 group rounded-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-lime text-black flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
            <Users className="w-9 h-9" aria-hidden="true" />
          </div>
          <div className="flex-1 text-start">
            <h2 className="text-2xl font-bold text-text group-hover:text-lime transition-colors">
              {t('welcome.i_work_here')}
            </h2>
            <p className="text-base text-grey-300 mt-1 leading-snug">
              {t('welcome.i_work_here_desc')}
            </p>
          </div>
        </Link>

        {/* Tile 2: Admin dashboard */}
        <Link
          href="/admin/login"
          className="glass-card min-h-[105px] w-full p-5 flex items-center gap-5 transition-all duration-200 active:scale-[0.98] border border-grey-700 hover:border-grey-500 rounded-2xl group"
        >
          <div className="w-16 h-16 rounded-2xl bg-grey-900 border border-grey-700 text-grey-300 group-hover:text-text flex items-center justify-center shrink-0 shadow-inner">
            <ShieldCheck className="w-9 h-9" aria-hidden="true" />
          </div>
          <div className="flex-1 text-start">
            <h2 className="text-2xl font-bold text-text">
              {t('welcome.admin_dashboard')}
            </h2>
            <p className="text-base text-grey-300 mt-1 leading-snug">
              {t('welcome.admin_dashboard_desc')}
            </p>
          </div>
        </Link>
      </div>

      {/* One-Tap Demo Access Panel for Judges & Presentations */}
      <section className="glass-card p-5 rounded-2xl border border-lime/30 bg-lime/[0.03] space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-lime" />
            <span className="text-xs font-bold uppercase tracking-wider text-lime">
              Instant 1-Tap Demo Access
            </span>
          </div>
          <Chip status="MATCH" label="NO SIGNUP NEEDED" />
        </div>

        <p className="text-xs text-grey-300">
          Click any role below to launch directly with pre-loaded mock shifts, pay receipts, and safety tickets:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* Worker SRMIST */}
          <a
            href="/api/auth/qr-login?role=worker&sector=srmist"
            className="p-3 rounded-xl bg-grey-900 border border-grey-700 hover:border-lime flex items-center justify-between group active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-5 h-5 text-lime" />
              <div className="text-start">
                <p className="text-sm font-bold text-text group-hover:text-lime">Sunita Devi</p>
                <p className="text-[11px] text-grey-400">Campus Facility Worker</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-grey-500 group-hover:text-lime" />
          </a>

          {/* Worker Metro */}
          <a
            href="/api/auth/qr-login?role=worker&sector=metro"
            className="p-3 rounded-xl bg-grey-900 border border-grey-700 hover:border-lime flex items-center justify-between group active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <HardHat className="w-5 h-5 text-lime" />
              <div className="text-start">
                <p className="text-sm font-bold text-text group-hover:text-lime">Ramesh Kumar</p>
                <p className="text-[11px] text-grey-400">Metro Construction Welder</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-grey-500 group-hover:text-lime" />
          </a>

          {/* Worker Hospital */}
          <a
            href="/api/auth/qr-login?role=worker&sector=hospital"
            className="p-3 rounded-xl bg-grey-900 border border-grey-700 hover:border-lime flex items-center justify-between group active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Stethoscope className="w-5 h-5 text-lime" />
              <div className="text-start">
                <p className="text-sm font-bold text-text group-hover:text-lime">Priya Sharma</p>
                <p className="text-[11px] text-grey-400">Hospital Sanitation Staff</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-grey-500 group-hover:text-lime" />
          </a>

          {/* Contractor Muster */}
          <a
            href="/api/auth/qr-login?role=contractor&sector=srmist"
            className="p-3 rounded-xl bg-grey-900 border border-grey-700 hover:border-lime flex items-center justify-between group active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Briefcase className="w-5 h-5 text-lime" />
              <div className="text-start">
                <p className="text-sm font-bold text-text group-hover:text-lime">Contractor Portal</p>
                <p className="text-[11px] text-grey-400">Balaji Facility Muster</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-grey-500 group-hover:text-lime" />
          </a>

          {/* Admin Cockpit (Spans 2 columns on sm) */}
          <a
            href="/api/auth/qr-login?role=admin&sector=srmist"
            className="sm:col-span-2 p-3 rounded-xl bg-lime/15 border-2 border-lime hover:bg-lime/25 flex items-center justify-between group active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-lime" />
              <div className="text-start">
                <p className="text-sm font-extrabold text-text group-hover:text-lime">
                  Employer Command Cockpit (Admin)
                </p>
                <p className="text-[11px] text-grey-300">
                  Principal Inspector &bull; SDG 8 Compliance &bull; Escalation Clock
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-lime" />
          </a>
        </div>
      </section>

      {/* Modal: Live Scannable Phone QR for Judges */}
      <Modal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="Phone QR Instant Auto-Login"
      >
        <div className="space-y-4 text-center">
          <p className="text-sm text-grey-300 text-start">
            Point your physical iPhone or Android camera at this QR code. Tap the notification banner on your phone screen to <strong>auto-login directly on your mobile device</strong>!
          </p>

          {/* Role and Sector Selectors */}
          <div className="flex flex-col gap-2 text-start p-3 rounded-xl bg-grey-900 border border-grey-800">
            <div>
              <span className="text-xs font-bold uppercase text-grey-400">Select Role:</span>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {(['worker', 'contractor', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedQrRole(r)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold capitalize transition-all ${
                      selectedQrRole === r ? 'bg-lime text-black' : 'bg-grey-800 text-grey-300 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1">
              <span className="text-xs font-bold uppercase text-grey-400">Select Industry:</span>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {(['srmist', 'metro', 'hospital'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedQrSector(s)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold capitalize transition-all ${
                      selectedQrSector === s ? 'bg-lime text-black' : 'bg-grey-800 text-grey-300 hover:text-white'
                    }`}
                  >
                    {s === 'srmist' ? 'Campus' : s === 'metro' ? 'Metro Rail' : 'Hospital'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Real QR Display */}
          <div className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl shadow-2xl border-4 border-lime mx-auto w-fit">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="Scan with mobile camera"
                className="w-52 h-52 object-contain"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-black font-bold">
                Generating QR...
              </div>
            )}
            <div className="mt-1.5">
              <span className="px-2 py-0.5 rounded bg-black text-lime font-mono text-[11px] font-bold uppercase tracking-wider">
                {selectedQrSector} &bull; {selectedQrRole}
              </span>
              <p className="text-[11px] text-black font-bold mt-0.5">Point phone camera to auto-login</p>
            </div>
          </div>

          <a
            href={qrTargetUrl}
            className="w-full py-3 px-4 rounded-xl bg-lime text-black font-bold text-base flex items-center justify-center gap-2 hover:bg-lime/90 active:scale-95 transition-all shadow"
          >
            <span>Open directly in this browser</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </Modal>

      {/* Database & Security Trust Badge */}
      <div className="p-3 rounded-2xl bg-obsidian/80 border border-grey-800 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
          <span className="text-grey-300 font-mono text-[11px]">
            MongoDB Atlas Database: <strong className="text-lime">fairshift_hisaab</strong>
          </span>
        </div>
        <span className="text-grey-500 text-[11px] font-mono">
          Account: vaibhavnr06@gmail.com &bull; Encrypted &bull; SCRAM-SHA-256
        </span>
      </div>

      {/* Bottom Footer & Showcase Link */}
      <footer className="pt-4 border-t border-grey-900/60 flex flex-col sm:flex-row items-center justify-between text-xs text-grey-500 gap-3">
        <p className="text-center sm:text-start">{t('app.motto')}</p>
        <Link
          href="/design"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-grey-900/80 text-grey-300 hover:text-lime font-bold border border-grey-800"
        >
          <Sparkles className="w-3.5 h-3.5 text-lime" />
          <span>Design System</span>
        </Link>
      </footer>
    </main>
  );
}
