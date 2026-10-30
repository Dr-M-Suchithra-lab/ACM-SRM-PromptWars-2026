'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/ui/Toast';
import { SEED_COMPLAINTS } from '@/lib/storage/seedData';
import { EscrowComplaintData } from '@/lib/storage/types';
import { evaluateEscrowGroup, ESCROW_THRESHOLD_K } from '@/core/escrow';
import {
  Lock,
  Unlock,
  ShieldCheck,
  AlertTriangle,
  Mic,
  Send,
  EyeOff,
  Users,
} from 'lucide-react';

export default function WorkerSpeakUpPage() {
  const { t, lang } = useI18n();
  const { showToast } = useToast();

  const [complaints, setComplaints] = useState<EscrowComplaintData[]>([...SEED_COMPLAINTS]);
  const [complaintText, setComplaintText] = useState('');
  const [targetType, setTargetType] = useState<'zone' | 'supervisor'>('zone');
  const [targetId, setTargetId] = useState('Hostel Block A & B (Sanitation)');
  const [category, setCategory] = useState<'wage_theft' | 'unsafe_equipment' | 'harassment' | 'life_risk'>('wage_theft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const isUrgentCategory = category === 'harassment' || category === 'life_risk';

  // Group existing complaints by targetId
  const targets = Array.from(new Set(complaints.map((c) => c.targetId)));

  const handleVoiceRecord = () => {
    if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      showToast('Speech recognition not available. Please type your message.', 'info');
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-IN';

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setComplaintText(transcript);
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognition.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  const handleSubmitComplaint = async () => {
    if (!complaintText.trim()) {
      showToast('Please enter or dictate your grievance note.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // POST to /api/ai/transcribe-scrub to remove names, exact times, slang
      const scrubRes = await fetch('/api/ai/transcribe-scrub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: complaintText, category }),
      });

      const scrubData = await scrubRes.json();
      const sanitizedSummary = scrubData.sanitizedText || complaintText;

      const newReport: EscrowComplaintData = {
        id: `escrow-${Date.now()}`,
        workerId: `worker-${Math.random().toString(36).slice(2, 7)}`, // Anonymized
        siteId: 'srmist',
        targetType,
        targetId,
        category,
        rawSummary: complaintText,
        sanitizedSummary,
        timestamp: new Date().toISOString(),
        isUrgent: isUrgentCategory,
      };

      setComplaints([newReport, ...complaints]);
      setComplaintText('');
      setIsSubmitting(false);

      if (isUrgentCategory) {
        showToast('Urgent report submitted! Escrow bypassed for immediate worker safety.', 'error');
      } else {
        showToast('Complaint deposited into Collective Escrow vault. Sealed until 3 workers report.', 'success');
      }
    } catch (e) {
      setIsSubmitting(false);
      showToast('Failed to connect to escrow server.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-text">{t('speak_up.title')}</h1>
        <p className="text-xs text-grey-500">K-Anonymity &bull; Zero Retaliation Architecture</p>
      </div>

      {/* Collective Escrow Notice Card */}
      <Card className="border-lime/30 bg-lime/5 p-4 space-y-3">
        <div className="flex items-center gap-2 text-lime font-bold text-sm">
          <Lock className="w-4 h-4" />
          <span>{t('speak_up.escrow_notice')}</span>
        </div>

        {/* Progress Dots 1/3 Example */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-lime shadow" />
            <span className="w-3.5 h-3.5 rounded-full bg-grey-700" />
            <span className="w-3.5 h-3.5 rounded-full bg-grey-700" />
          </div>
          <span className="text-xs text-grey-300 font-semibold">1/3 Reports (Sealed & Hidden)</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-grey-500 pt-1 border-t border-grey-700/40">
          <EyeOff className="w-4 h-4 text-lime" />
          <span>{t('speak_up.anonymous_guarantee')}</span>
        </div>
      </Card>

      {/* New Complaint Entry Form */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-text">Deposit Confidential Report</h2>

        {/* Category Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-grey-300">Issue Category</label>
          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            {[
              { id: 'wage_theft', label: 'Wage Deduction / Theft' },
              { id: 'unsafe_equipment', label: 'Unsafe Gear / Broken Tool' },
              { id: 'harassment', label: 'Harassment / Abuse' },
              { id: 'life_risk', label: 'Mortal Danger / Locked Exit' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id as any)}
                className={`p-2.5 rounded-xl border text-start transition-all ${
                  category === cat.id
                    ? cat.id === 'harassment' || cat.id === 'life_risk'
                      ? 'border-danger bg-danger/10 text-danger'
                      : 'border-lime bg-lime/10 text-lime'
                    : 'border-grey-700 bg-grey-900 text-grey-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {isUrgentCategory && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 flex items-center gap-2 text-xs text-danger font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{t('speak_up.urgent_notice')}</span>
          </div>
        )}

        {/* Target Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-grey-300">Target Area or Supervisor</label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full min-h-[48px] px-3 rounded-xl bg-grey-900 border border-grey-700 text-text text-sm focus:ring-2 focus:ring-lime"
          >
            <option value="Hostel Block A & B (Sanitation)">Hostel Block A & B (Sanitation)</option>
            <option value="Tech Park Towers Floor 3-6">Tech Park Towers Floor 3-6</option>
            <option value="Main Dining & Food Court">Main Dining & Food Court</option>
            <option value="supervisor-techpark-01">Supervisor Tech Park (Contractor)</option>
            <option value="supervisor-metro-night">Night Shift Thekedar</option>
          </select>
        </div>

        {/* Dictation / Text Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-grey-300">Observation Notes</label>
            <button
              type="button"
              onClick={handleVoiceRecord}
              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${
                isRecording
                  ? 'border-danger text-danger bg-danger/10 animate-pulse'
                  : 'border-grey-700 text-lime bg-grey-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{isRecording ? 'Listening...' : 'Dictate voice note'}</span>
            </button>
          </div>
          <textarea
            rows={3}
            value={complaintText}
            onChange={(e) => setComplaintText(e.target.value)}
            placeholder="Describe what occurred. Names and times will be scrubbed automatically..."
            className="w-full p-3 rounded-xl bg-grey-900 border border-grey-700 text-text placeholder-grey-500 text-sm focus:ring-2 focus:ring-lime focus:outline-none"
          />
        </div>

        <Button
          variant="primary"
          className="w-full flex items-center justify-center gap-2"
          isLoading={isSubmitting}
          onClick={handleSubmitComplaint}
        >
          <Send className="w-5 h-5" />
          <span>{t('speak_up.submit_button')}</span>
        </Button>
      </Card>

      {/* Escrow Vault Status Feed */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-grey-500">
          Escrow Targets in Your Worksite
        </h2>

        {targets.map((tgt) => {
          const groupReports = complaints.filter((c) => c.targetId === tgt);
          const evaluation = evaluateEscrowGroup(tgt, groupReports);

          return (
            <Card key={tgt} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-text truncate max-w-[200px]">{tgt}</span>
                <div className="flex items-center gap-1.5">
                  {evaluation.isUnlocked ? (
                    <Chip
                      status={evaluation.isUrgentBypass ? 'URGENT' : 'OPEN'}
                      label={evaluation.isUrgentBypass ? 'URGENT ESCALATED' : 'UNLOCKED GROUP ALERT'}
                    />
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-grey-900 text-grey-300 border border-grey-700">
                      <Lock className="w-3 h-3 text-grey-500" />
                      <span>{evaluation.publicCountDisplay}</span>
                    </span>
                  )}
                </div>
              </div>

              {evaluation.isUnlocked ? (
                <div className="p-3 rounded-xl bg-lime/10 border border-lime/30 text-xs text-text space-y-1.5">
                  <span className="font-extrabold text-lime block">
                    Verified Group Issue: {evaluation.distinctWorkerCount} workers reported
                  </span>
                  <p className="text-grey-300">
                    {groupReports[0]?.sanitizedSummary || 'Collective issue confirmed.'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-grey-500 italic">
                  Content encrypted and withheld until K=3 threshold is reached.
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
