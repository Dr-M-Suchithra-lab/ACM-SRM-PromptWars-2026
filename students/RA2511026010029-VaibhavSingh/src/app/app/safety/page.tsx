'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { SEED_HAZARDS } from '@/lib/storage/seedData';
import { HazardTicketData } from '@/lib/storage/types';
import { getEscalationStatus } from '@/core/escalation';
import { canCloseTicket } from '@/core/closure';
import {
  ShieldAlert,
  Camera,
  Mic,
  MapPin,
  Clock,
  Eye,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export default function WorkerSafetyPage() {
  const { t, lang } = useI18n();
  const { showToast } = useToast();
  const [hazards, setHazards] = useState<HazardTicketData[]>([...SEED_HAZARDS]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<HazardTicketData | null>(null);

  // 3-step report state
  const [reportStep, setReportStep] = useState<1 | 2 | 3>(1);
  const [hazardPhoto, setHazardPhoto] = useState<string>('');
  const [hazardVoiceText, setHazardVoiceText] = useState<string>('');
  const [hazardZone, setHazardZone] = useState<string>('Hostel Block A & B (Sanitation)');
  const [hazardSeverity, setHazardSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [isRecording, setIsRecording] = useState(false);

  // After photo upload state for Two-Key closure
  const [afterPhotoUrl, setAfterPhotoUrl] = useState('');
  const [isAiComparing, setIsAiComparing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Browser-side photo downscale & EXIF strip
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = document.createElement('img');
    const reader = new FileReader();

    reader.onload = (event) => {
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // Drawing into clean canvas strips EXIF metadata automatically
        ctx?.drawImage(img, 0, 0, width, height);

        const downscaledDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setHazardPhoto(downscaledDataUrl);
        showToast('Photo downscaled to 1024px and EXIF stripped safely.', 'info');
      };
    };
    reader.readAsDataURL(file);
  };

  const handleVoiceRecord = () => {
    if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      showToast('Speech recognition not available. Please type your observation.', 'info');
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
        setHazardVoiceText(transcript);
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognition.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  const handleSubmitHazard = () => {
    const newHazard: HazardTicketData = {
      id: `hazard-${Date.now()}`,
      siteId: 'srmist',
      zone: hazardZone,
      title: hazardVoiceText || 'Worksite Hazard Intimation',
      description: hazardVoiceText || 'Hazard reported via Worker Companion safety tab.',
      category: 'electrical',
      severity: hazardSeverity,
      reportedBy: 'worker-sunita',
      reportedByName: 'Sunita Devi',
      createdAt: new Date().toISOString(),
      status: 'OPEN',
      reporterConfirmed: false,
      corroboratorCount: 0,
      corroborators: [],
      beforePhotoUrl: hazardPhoto || '/icons/hazard-electric.svg',
    };

    setHazards([newHazard, ...hazards]);
    setIsReportModalOpen(false);
    setReportStep(1);
    setHazardVoiceText('');
    setHazardPhoto('');
    showToast('Hazard reported. Clock started for site supervisor (4h SLA).', 'success');
  };

  const handleISeeItToo = (ticketId: string) => {
    setHazards((prev) =>
      prev.map((h) => {
        if (h.id === ticketId) {
          const newCorroborators = [...h.corroborators, 'worker-sunita'];
          const newCount = h.corroboratorCount + 1;
          const newSeverity = newCount >= 2 ? 'URGENT' : h.severity;
          return {
            ...h,
            corroboratorCount: newCount,
            corroborators: newCorroborators,
            severity: newSeverity,
          };
        }
        return h;
      })
    );
    showToast('Corroboration logged! Severity escalated under collective witness rules.', 'success');
  };

  const handleRunAiVisionCompare = async () => {
    if (!selectedTicket) return;
    setIsAiComparing(true);

    try {
      const res = await fetch('/api/ai/vision-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          beforePhotoUrl: selectedTicket.beforePhotoUrl || 'before.jpg',
          afterPhotoUrl: afterPhotoUrl || 'after.jpg',
          hazardTitle: selectedTicket.title,
        }),
      });

      const data = await res.json();
      setAiResult(data);
      setIsAiComparing(false);
      showToast('AI Advisory evaluation complete.', 'info');
    } catch (e) {
      setIsAiComparing(false);
    }
  };

  const handleConfirmTwoKeyClosure = () => {
    if (!selectedTicket) return;

    const evaluation = canCloseTicket({
      hasAfterPhoto: !!afterPhotoUrl,
      reporterConfirmed: true,
      corroboratorCount: selectedTicket.corroboratorCount,
      aiAdvisory: aiResult || undefined,
    });

    if (!evaluation.canClose) {
      showToast(evaluation.reason, 'error');
      return;
    }

    setHazards((prev) =>
      prev.map((h) =>
        h.id === selectedTicket.id
          ? {
              ...h,
              status: 'VERIFIED_CLOSED',
              afterPhotoUrl: afterPhotoUrl,
              reporterConfirmed: true,
            }
          : h
      )
    );

    showToast('Two-Key closure verified! Hazard ticket closed with worker confirmation.', 'success');
    setIsVerifyModalOpen(false);
    setSelectedTicket(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Report Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text">{t('safety.title')}</h1>
          <p className="text-xs text-grey-500">Statutory Clock &bull; Two-Key Closure Loop</p>
        </div>
        <Button
          variant="danger"
          size="md"
          onClick={() => setIsReportModalOpen(true)}
          className="flex items-center gap-1.5 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{t('safety.report_button')}</span>
        </Button>
      </div>

      {/* Two-Key Rule Reminder Card */}
      <Card className="border-lime/30 bg-lime/5 p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-lime shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <span className="font-extrabold text-lime uppercase tracking-wider block">
            {t('safety.two_key_title')}
          </span>
          <p className="text-grey-300">{t('safety.two_key_desc')}</p>
        </div>
      </Card>

      {/* Live Hazard Cards */}
      <div className="space-y-4">
        {hazards.map((ticket) => {
          const escalation = getEscalationStatus(ticket.createdAt);
          const isClosed = ticket.status === 'VERIFIED_CLOSED';

          return (
            <Card key={ticket.id} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-grey-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-lime" />
                  <span>{ticket.zone}</span>
                </span>
                <Chip
                  status={isClosed ? 'MATCH' : ticket.severity === 'URGENT' ? 'URGENT' : 'OPEN'}
                  label={isClosed ? 'VERIFIED CLOSED' : ticket.severity}
                />
              </div>

              <h2 className="text-lg font-bold text-text leading-snug">{ticket.title}</h2>
              <p className="text-sm text-grey-300">{ticket.description}</p>

              {/* Statutory Clock Bar */}
              <div className="p-3 rounded-xl bg-grey-900 border border-grey-700 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-text flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-warn" />
                    <span>{escalation.stageTitle}</span>
                  </span>
                  <span className="text-grey-300">{escalation.elapsedHours}h elapsed</span>
                </div>
                <div className="w-full h-2 bg-grey-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      escalation.stage === 'AUTO_INCIDENT_REPORT'
                        ? 'bg-danger'
                        : escalation.isBreached
                        ? 'bg-warn'
                        : 'bg-lime'
                    }`}
                    style={{ width: `${escalation.slaProgressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-grey-300">{escalation.actionRequired}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-grey-700/50">
                <div className="flex items-center gap-1.5 text-xs text-grey-300">
                  <Eye className="w-4 h-4 text-lime" />
                  <span>{ticket.corroboratorCount} peer corroborator(s)</span>
                </div>

                {!isClosed ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleISeeItToo(ticket.id)}
                      className="px-3 py-1.5 rounded-lg bg-grey-900 border border-grey-700 text-xs font-bold text-text hover:border-lime active:scale-95"
                    >
                      {t('safety.i_see_it_too')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setIsVerifyModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-lime text-black text-xs font-bold hover:brightness-105 active:scale-95"
                    >
                      Verify fix
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-extrabold text-lime flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Two-Key Verified</span>
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* 3-Step Report Hazard Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title={t('safety.report_button')}
      >
        <div className="space-y-4">
          {/* Step Indicators */}
          <div className="flex items-center justify-around border-b border-grey-700 pb-2 text-xs font-bold">
            <span className={reportStep === 1 ? 'text-lime' : 'text-grey-500'}>{t('safety.step1')}</span>
            <span className={reportStep === 2 ? 'text-lime' : 'text-grey-500'}>{t('safety.step2')}</span>
            <span className={reportStep === 3 ? 'text-lime' : 'text-grey-500'}>{t('safety.step3')}</span>
          </div>

          {/* Step 1: Photo or Voice */}
          {reportStep === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-grey-300">
                Take a photo or speak your observation. EXIF metadata will be stripped before upload.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <label className="p-4 rounded-xl bg-grey-900 border border-grey-700 hover:border-lime flex flex-col items-center gap-2 cursor-pointer text-center">
                  <Camera className="w-8 h-8 text-lime" />
                  <span className="text-xs font-bold">Attach Photo</span>
                  <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                </label>

                <button
                  type="button"
                  onClick={handleVoiceRecord}
                  className={`p-4 rounded-xl bg-grey-900 border border-grey-700 flex flex-col items-center gap-2 text-center ${
                    isRecording ? 'border-danger text-danger animate-pulse' : 'hover:border-lime'
                  }`}
                >
                  <Mic className="w-8 h-8 text-lime" />
                  <span className="text-xs font-bold">{isRecording ? 'Listening...' : 'Voice Note'}</span>
                </button>
              </div>

              {hazardPhoto && (
                <div className="p-2 rounded-xl bg-grey-900 border border-lime text-xs text-lime flex items-center justify-between">
                  <span>Photo downscaled & attached</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}

              <Field
                id="hazard-desc-typed"
                label="Or type hazard note"
                placeholder="Exposed water pipe leaking near switchboard..."
                value={hazardVoiceText}
                onChange={(e) => setHazardVoiceText(e.target.value)}
              />

              <Button variant="primary" className="w-full" onClick={() => setReportStep(2)}>
                Next: Where is it?
              </Button>
            </div>
          )}

          {/* Step 2: Where is it? */}
          {reportStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-grey-300">Select the specific zone in your site:</p>
              <div className="space-y-2">
                {[
                  'Hostel Block A & B (Sanitation)',
                  'Tech Park Towers Floor 3-6',
                  'Main Dining & Food Court',
                  'Central Library & Grounds',
                ].map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setHazardZone(z)}
                    className={`w-full p-3 rounded-xl border text-start text-sm font-bold transition-all ${
                      hazardZone === z
                        ? 'border-lime bg-lime/10 text-lime'
                        : 'border-grey-700 bg-grey-900 text-text'
                    }`}
                  >
                    {z}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setReportStep(1)} className="flex-1">
                  Back
                </Button>
                <Button variant="primary" onClick={() => setReportStep(3)} className="flex-1">
                  Next: How urgent?
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: How bad? */}
          {reportStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-grey-300">Select hazard severity level:</p>
              <div className="grid grid-cols-2 gap-2.5">
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setHazardSeverity(sev)}
                    className={`p-3 rounded-xl border font-bold text-xs capitalize ${
                      hazardSeverity === sev
                        ? sev === 'URGENT'
                          ? 'border-danger bg-danger/15 text-danger'
                          : 'border-lime bg-lime/15 text-lime'
                        : 'border-grey-700 bg-grey-900 text-text'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>

              <Button variant="primary" className="w-full" onClick={handleSubmitHazard}>
                Submit hazard report
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Two-Key Fix Verification Modal */}
      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title="Two-Key Remedy Verification"
      >
        {selectedTicket && (
          <div className="space-y-4">
            <p className="text-sm text-grey-300">
              Contractor or supervisor uploaded After-remedy proof. Confirm physical repair to close ticket.
            </p>

            <div className="p-3.5 rounded-xl bg-grey-900 border border-grey-700 space-y-2 text-xs">
              <div className="flex justify-between font-bold">
                <span>Before Photo</span>
                <span className="text-danger">Hazard Documented</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Supervisor After Photo</span>
                <span className={afterPhotoUrl ? 'text-lime' : 'text-warn'}>
                  {afterPhotoUrl ? 'Remedy Photo Attached' : 'Awaiting Supervisor Photo'}
                </span>
              </div>
            </div>

            {/* Simulated supervisor after photo button for demo */}
            {!afterPhotoUrl && (
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => {
                  setAfterPhotoUrl('/icons/remedy-clean.svg');
                  showToast('Supervisor After photo uploaded.', 'info');
                }}
              >
                Simulate supervisor photo upload
              </Button>
            )}

            {/* Run AI Vision Advisory Check */}
            {afterPhotoUrl && (
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  size="md"
                  isLoading={isAiComparing}
                  onClick={handleRunAiVisionCompare}
                  className="w-full flex items-center justify-center gap-2 border-lime/40 text-lime"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Run Gemini advisory vision comparison</span>
                </Button>

                {aiResult && (
                  <div className="p-3 rounded-xl bg-lime/10 border border-lime/30 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-lime">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{aiResult.notes}</span>
                    </div>
                    <p className="text-[11px] text-grey-300">
                      Advisory confidence: {Math.round(aiResult.confidenceScore * 100)}% &bull; Human Two-Key confirmation required.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-grey-700 flex gap-2">
              <Button variant="ghost" onClick={() => setIsVerifyModalOpen(false)} className="flex-1">
                Keep open
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmTwoKeyClosure}
                disabled={!afterPhotoUrl}
                className="flex-1"
              >
                I confirm, close ticket
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
