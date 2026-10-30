'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { getRolesForSector } from '@/config/roles';
import { SECTORS } from '@/config/sectors';
import { BigIconTile } from '@/components/ui/BigIconTile';
import { ReadAloudButton } from '@/components/ui/ReadAloudButton';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ArrowLeft, User, HardHat, Briefcase, Shield } from 'lucide-react';

function SelectRoleContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectorId = searchParams.get('sector') || 'srmist';

  const sector = SECTORS[sectorId] || SECTORS.srmist;
  const roles = getRolesForSector(sectorId);

  const handleSelectRole = (roleId: string) => {
    router.push(`/login/auth?sector=${sectorId}&role=${roleId}`);
  };

  return (
    <main id="main-content" className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/login/sector"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-grey-900 border border-grey-700 text-text font-bold text-sm active:scale-95"
          aria-label="Back to sector selection"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </Link>
        <div className="flex items-center gap-2">
          <ReadAloudButton />
          <LanguageSwitcher />
        </div>
      </div>

      {/* Progress Dots Row: Step 2 of 3 */}
      <div className="flex items-center justify-center gap-2 py-1" aria-label="Step 2 of 3: Choose role">
        <div className="w-2.5 h-2.5 rounded-full bg-lime/40" />
        <div className="w-8 h-2.5 rounded-full bg-lime" />
        <div className="w-2.5 h-2.5 rounded-full bg-grey-700" />
      </div>

      {/* Title */}
      <div className="text-start space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-grey-500">Step 2 of 3</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text">{t('login.select_role')}</h1>
        <p className="text-base text-grey-300">
          Selected: <strong className="text-lime">{sector.name}</strong>
        </p>
      </div>

      {/* Role Big Icon Tiles */}
      <div className="space-y-4">
        {roles.map((role) => (
          <BigIconTile
            key={role.id}
            icon={
              role.systemRole === 'contractor' ? (
                <Briefcase className="w-8 h-8" />
              ) : role.systemRole === 'admin' ? (
                <Shield className="w-8 h-8" />
              ) : (
                <User className="w-8 h-8" />
              )
            }
            title={t(role.labelKey)}
            subtitle={t(role.descriptionKey)}
            onClick={() => handleSelectRole(role.id)}
          />
        ))}
      </div>

      <div className="pt-4 text-center text-xs text-grey-500">
        Roles determine companion features and approval authorities
      </div>
    </main>
  );
}

export default function SelectRolePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-text">Loading roles...</div>}>
      <SelectRoleContent />
    </Suspense>
  );
}
