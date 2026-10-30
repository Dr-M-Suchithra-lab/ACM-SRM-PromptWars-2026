'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { useTheme } from '@/lib/theme/context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { BigIconTile } from '@/components/ui/BigIconTile';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ReadAloudButton } from '@/components/ui/ReadAloudButton';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { useToast } from '@/components/ui/Toast';
import { HardHat, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DesignSystemShowcasePage() {
  const { t, lang, dir } = useI18n();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fieldValue, setFieldValue] = useState('');

  return (
    <main id="main-content" className="max-w-4xl mx-auto p-4 sm:p-8 space-y-10">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-grey-700">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-grey-300 hover:text-lime"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Welcome</span>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-text">Design System & Theme Showcase</h1>
          <p className="text-base text-grey-300 mt-1">
            Active Theme: <span className="font-bold text-lime capitalize">{theme}</span> | Language:{' '}
            <span className="font-bold text-lime uppercase">{lang}</span> (Dir: {dir})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </header>

      {/* Read Aloud Bar */}
      <div className="flex items-center justify-between p-4 glass-card">
        <div>
          <h2 className="text-lg font-bold text-text">Speech Accessibility Check</h2>
          <p className="text-sm text-grey-300">Reads screen aloud in active locale speech synthesizer.</p>
        </div>
        <ReadAloudButton />
      </div>

      {/* Buttons Section */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-grey-500">
          Buttons (Min Height 56px, Verb-First, Sentence Case)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button variant="primary">Check in now</Button>
          <Button variant="secondary">View work receipt</Button>
          <Button variant="danger">Report live hazard</Button>
          <Button variant="ghost">Cancel request</Button>
        </div>
        <div className="mt-4">
          <Button variant="huge">Check in now (72px Primary Worker Check-In)</Button>
        </div>
      </section>

      {/* Chips Section */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-grey-500">
          Status Chips (13px, 700, ALL CAPS in English + Icon)
        </h2>
        <div className="flex flex-wrap gap-3">
          <Chip status="MATCH" label="MATCH" />
          <Chip status="NEEDS_REVIEW" label="NEEDS REVIEW" />
          <Chip status="URGENT" label="URGENT" />
          <Chip status="OPEN" label="OPEN" />
          <Chip status="IN_PROGRESS" label="IN PROGRESS" />
        </div>
      </section>

      {/* Money Display Section */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-grey-500">
          Money Display (44px, 800, Tabular Numerals 0 to 9)
        </h2>
        <Card className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm text-grey-300 font-semibold">{t('money.title')}</p>
            <p className="money-tabular text-lime">₹14,250</p>
          </div>
          <div className="text-end">
            <p className="text-sm text-grey-300 font-semibold">Unpaid Overtime Arrears</p>
            <p className="money-tabular text-danger">₹1,200</p>
          </div>
        </Card>
      </section>

      {/* BigIconTile Section */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-grey-500">
          BigIconTile (Min 96px, Accessible Large Touch Target)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BigIconTile
            icon={<HardHat className="w-8 h-8" />}
            title="Construction & Infrastructure Site"
            subtitle="Metro rail lines, civil projects, scaffolding"
            onClick={() => showToast('Selected Construction Site!', 'success')}
          />
          <BigIconTile
            icon={<Sparkles className="w-8 h-8" />}
            title="SRMIST Campus Facility Services"
            subtitle="Hostel sanitation, housekeeping & technical team"
            selected
            onClick={() => showToast('Selected SRMIST Campus!', 'info')}
          />
        </div>
      </section>

      {/* Form Fields Section */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-grey-500">
          Accessible Form Fields (Visible Labels & Error Icons)
        </h2>
        <Card>
          <Field
            id="worker-mobile"
            label="Mobile number (for 6-digit OTP)"
            placeholder="+91 98765 43210"
            helperText="Enter 10-digit number. In demo mode, OTP is shown automatically."
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
          />
          <Field
            id="field-error-example"
            label="Daily wage rate (Rupees)"
            defaultValue="0"
            error="Wage cannot be zero under Minimum Wage statutory rules."
          />
        </Card>
      </section>

      {/* Interactive Toast & Modal Controls */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-grey-500">
          Modals & Notifications
        </h2>
        <div className="flex flex-wrap gap-4">
          <Button
            variant="secondary"
            onClick={() => showToast('Shift check-in recorded successfully on tamper-evident ledger.', 'success')}
          >
            Trigger Success Toast
          </Button>
          <Button
            variant="secondary"
            onClick={() => showToast('Consensus Overtime Anomaly: 3+ workers reported.', 'error')}
          >
            Trigger Error Toast
          </Button>
          <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
            Open Accessible Modal
          </Button>
        </div>
      </section>

      {/* Test Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Two-Key Verification Modal">
        <div className="space-y-4">
          <p className="text-base text-grey-300">
            This dialog tests accessible focus trap, keyboard Escape dismissal, and high-contrast glass surfaces.
          </p>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-lime/10 border border-lime/30 text-lime text-sm font-bold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Two-Key Rule: Both contractor photo and worker tap are verified.</span>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-grey-700">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setIsModalOpen(false)}>
              Confirm resolution
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
