'use client';

import React from 'react';
import { useI18n, SupportedLang, LANGUAGE_LABELS } from '@/lib/i18n/context';
import { Globe } from 'lucide-react';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <div className={`inline-flex items-center gap-1.5 p-1 rounded-xl bg-grey-900 border border-grey-700 ${className}`}>
      <Globe className="w-4 h-4 text-grey-300 ms-1.5 shrink-0" aria-hidden="true" />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as SupportedLang)}
        aria-label="Change language"
        className="bg-transparent text-text text-sm font-bold py-1 px-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime cursor-pointer"
      >
        {(Object.keys(LANGUAGE_LABELS) as SupportedLang[]).map((key) => (
          <option key={key} value={key} className="bg-obsidian text-text py-1">
            {LANGUAGE_LABELS[key].nativeName} ({LANGUAGE_LABELS[key].name})
          </option>
        ))}
      </select>
    </div>
  );
}
