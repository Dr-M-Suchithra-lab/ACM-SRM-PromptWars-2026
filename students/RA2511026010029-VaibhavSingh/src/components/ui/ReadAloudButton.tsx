'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useI18n, LANGUAGE_LABELS } from '@/lib/i18n/context';

export interface ReadAloudButtonProps {
  textToRead?: string;
  className?: string;
}

export function ReadAloudButton({ textToRead, className = '' }: ReadAloudButtonProps) {
  const { lang, t } = useI18n();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceNotice('Voice synthesis not supported on this browser.');
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const targetText =
      textToRead ||
      document.querySelector('main')?.textContent ||
      document.body.innerText ||
      t('app.motto');

    const cleanText = targetText.replace(/\s+/g, ' ').trim().slice(0, 1000);
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const speechTag = LANGUAGE_LABELS[lang]?.speechTag || 'en-IN';
    utterance.lang = speechTag;
    utterance.rate = 0.9; // Slightly slower for clarity

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) => v.lang.startsWith(lang) || v.lang === speechTag);
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    } else if (voices.length === 0) {
      // Voice may still be loading or absent
      setVoiceNotice('Using default voice (language-specific voice not installed).');
      setTimeout(() => setVoiceNotice(null), 4000);
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setVoiceNotice('Audio readout ended or paused.');
      setTimeout(() => setVoiceNotice(null), 3000);
    };

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="inline-flex flex-col items-center">
      <button
        type="button"
        onClick={handleSpeak}
        aria-label={isSpeaking ? 'Stop reading screen' : 'Read screen aloud'}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-grey-900 border border-grey-700 hover:border-lime text-text text-sm font-bold active:scale-95 transition-all ${
          isSpeaking ? 'border-lime text-lime animate-pulse' : ''
        } ${className}`}
      >
        {isSpeaking ? <VolumeX className="w-4 h-4 text-lime" /> : <Volume2 className="w-4 h-4 text-lime" />}
        <span>{isSpeaking ? 'Stop audio' : t('settings.read_aloud')}</span>
      </button>
      {voiceNotice && (
        <span className="text-xs text-grey-300 mt-1 max-w-xs text-center">{voiceNotice}</span>
      )}
    </div>
  );
}
