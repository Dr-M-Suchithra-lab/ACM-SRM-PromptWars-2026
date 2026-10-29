'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import enMessages from '@messages/en.json';

export type SupportedLang = 'en' | 'hi' | 'bn' | 'ta' | 'pa' | 'ur';

export interface I18nContextType {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
  dir: 'ltr',
});

export const LANGUAGE_LABELS: Record<SupportedLang, { name: string; nativeName: string; speechTag: string }> = {
  en: { name: 'English', nativeName: 'English', speechTag: 'en-IN' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', speechTag: 'hi-IN' },
  bn: { name: 'Bangla', nativeName: 'বাংলা', speechTag: 'bn-IN' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', speechTag: 'ta-IN' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', speechTag: 'pa-IN' },
  ur: { name: 'Urdu', nativeName: 'اردو', speechTag: 'ur-PK' },
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SupportedLang>('en');
  const [messages, setMessages] = useState<Record<string, string>>(enMessages);

  useEffect(() => {
    // Read persisted language on mount
    const saved = localStorage.getItem('fairshift_lang') as SupportedLang;
    if (saved && LANGUAGE_LABELS[saved]) {
      setLang(saved);
    }
  }, []);

  const setLang = async (newLang: SupportedLang) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fairshift_lang', newLang);
      document.documentElement.lang = newLang;
      document.documentElement.dir = newLang === 'ur' ? 'rtl' : 'ltr';
    }

const MESSAGES_LOADERS: Record<SupportedLang, () => Promise<{ default: Record<string, string> }>> = {
  en: () => import('@messages/en.json'),
  hi: () => import('@messages/hi.json'),
  bn: () => import('@messages/bn.json'),
  ta: () => import('@messages/ta.json'),
  pa: () => import('@messages/pa.json'),
  ur: () => import('@messages/ur.json'),
};

    try {
      if (newLang === 'en') {
        setMessages(enMessages);
      } else {
        const loader = MESSAGES_LOADERS[newLang];
        if (loader) {
          const loaded = await loader();
          setMessages(loaded.default || loaded);
        }
      }
    } catch (e) {
      console.warn(`Could not dynamically load messages for ${newLang}, falling back to English.`);
      setMessages(enMessages);
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let str = messages[key] || (enMessages as Record<string, string>)[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      }
    }
    return str;
  };

  const dir = lang === 'ur' ? 'rtl' : 'ltr';

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
