'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { SECTORS } from '@/config/sectors';
import { BigIconTile } from '@/components/ui/BigIconTile';
import { ReadAloudButton } from '@/components/ui/ReadAloudButton';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import {
  ArrowLeft,
  GraduationCap,
  HardHat,
  Stethoscope,
  Building2,
  Factory,
  Briefcase,
} from 'lucide-react';

const SECTOR_ICON_MAP: Record<string, React.ReactNode> = {
  srmist: <GraduationCap className="w-8 h-8" />,
  metro: <HardHat className="w-8 h-8" />,
  hospital: <Stethoscope className="w-8 h-8" />,
  office: <Building2 className="w-8 h-8" />,
  factory: <Factory className="w-8 h-8" />,
};

export default function SelectSectorPage() {
  const { t } = useI18n();
  const router = useRouter();

  const handleSelectSector = (sectorId: string) => {
    router.push(`/login/role?sector=${sectorId}`);
  };

  return (
    <main id="main-content" className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-grey-900 border border-grey-700 text-text font-bold text-sm active:scale-95"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </Link>
        <div className="flex items-center gap-2">
          <ReadAloudButton />
          <LanguageSwitcher />
        </div>
      </div>

      {/* Progress Dots Row: Step 1 of 3 */}
      <div className="flex items-center justify-center gap-2 py-1" aria-label="Step 1 of 3: Choose sector">
        <div className="w-8 h-2.5 rounded-full bg-lime" />
        <div className="w-2.5 h-2.5 rounded-full bg-grey-700" />
        <div className="w-2.5 h-2.5 rounded-full bg-grey-700" />
      </div>

      {/* Title */}
      <div className="text-start space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-grey-500">Step 1 of 3</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text">{t('login.select_sector')}</h1>
        <p className="text-base text-grey-300">Choose the type of site where you work today.</p>
      </div>

      {/* Sector Big Icon Tiles */}
      <div className="space-y-3.5">
        {Object.values(SECTORS).map((sector) => (
          <BigIconTile
            key={sector.id}
            icon={SECTOR_ICON_MAP[sector.id] || <Briefcase className="w-8 h-8" />}
            title={sector.name}
            subtitle={sector.defaultCoordinates.name}
            onClick={() => handleSelectSector(sector.id)}
          />
        ))}
      </div>

      <div className="pt-2 text-center text-xs text-grey-500">
        FairShift Two-Key Architecture &bull; Works across multiple sectors via configuration
      </div>
    </main>
  );
}
