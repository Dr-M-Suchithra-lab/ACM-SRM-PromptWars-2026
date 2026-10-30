'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { SEED_RECEIPTS } from '@/lib/storage/seedData';
import { WorkReceipt } from '@/core/receipt';
import {
  Volume2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Users,
  Send,
  FileCheck,
} from 'lucide-react';

export default function WorkerMoneyPage() {
  const { t, lang } = useI18n();
  const { showToast } = useToast();
  const [receipts, setReceipts] = useState<WorkReceipt[]>([...SEED_RECEIPTS]);
  const [selectedReceipt, setSelectedReceipt] = useState<WorkReceipt | null>(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);

  // Compute total aggregates
  const totalBasePay = receipts.reduce((acc, r) => acc + (r.paid.hours * r.paid.ratePerHour), 0);
  const totalOvertime = receipts.reduce((acc, r) => acc + (r.worked.hours > 8 ? (r.worked.hours - 8) * r.worked.ratePerHour * 2 : 0), 0);
  const totalDeductions = 100;
  const netEarnings = Math.max(0, totalBasePay + totalOvertime - totalDeductions);

  // Unpaid gap across receipts
  const totalUnpaidGap = receipts.reduce((acc, r) => acc + Math.max(0, r.rupeeDifference), 0);

  const handleSpeakPay = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const speechText = `Total earnings: INR ${netEarnings}. Base pay: INR ${totalBasePay}. Overtime earnings: INR ${totalOvertime}. Deductions: INR ${totalDeductions}. Unpaid balance awaiting review: INR ${totalUnpaidGap}.`;
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : lang === 'bn' ? 'bn-IN' : lang === 'pa' ? 'pa-IN' : lang === 'ur' ? 'ur-PK' : 'en-IN';
    window.speechSynthesis.speak(utterance);
  };

  const handleAction = (type: 'correction' | 'private' | 'group' | 'agree') => {
    if (!selectedReceipt) return;

    if (type === 'correction') {
      setIsCorrectionModalOpen(true);
      return;
    }

    if (type === 'private') {
      showToast('Receipt saved to your private encrypted offline wallet.', 'info');
      setSelectedReceipt(null);
    } else if (type === 'group') {
      showToast('Discrepancy added to collective group tally. Stays locked until 3 workers report.', 'success');
      setSelectedReceipt(null);
    } else if (type === 'agree') {
      setReceipts((prev) =>
        prev.map((r) =>
          r.id === selectedReceipt.id
            ? { ...r, status: 'MATCH', explanation: 'Closed and agreed by worker.' }
            : r
        )
      );
      showToast('Receipt verified and confirmed. Closed under Two-Key Rule.', 'success');
      setSelectedReceipt(null);
    }
  };

  const handleSubmitCorrection = () => {
    if (!selectedReceipt) return;
    showToast('Correction request submitted to thekedar for wage reconciliation.', 'success');
    setIsCorrectionModalOpen(false);
    setSelectedReceipt(null);
  };

  return (
    <div className="space-y-6">
      {/* Title & Speak My Pay Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text">{t('money.title')}</h1>
          <p className="text-xs text-grey-500">October 2026 &bull; Verified Shifts</p>
        </div>
        <button
          onClick={handleSpeakPay}
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-lime/10 border border-lime text-lime font-bold text-sm active:scale-95"
        >
          <Volume2 className="w-4 h-4" />
          <span>{t('money.speak_pay')}</span>
        </button>
      </div>

      {/* Money Jar Card */}
      <Card className="flex flex-col items-center p-6 space-y-4">
        {/* Money Jar SVG */}
        <div className="relative w-40 h-48 flex items-end justify-center">
          <svg className="w-full h-full" viewBox="0 0 160 200" fill="none">
            {/* Jar Neck and Rim */}
            <rect x="50" y="8" width="60" height="14" rx="4" fill="rgba(255,255,255,0.12)" stroke="#A3E635" strokeWidth="2" />
            <path d="M45 22 C45 35 20 50 20 80 L20 170 C20 188 35 195 80 195 C125 195 140 188 140 170 L140 80 C140 50 115 35 115 22 Z"
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="2.5"
            />
            {/* Green Base Wages Fill (Bottom) */}
            <path d="M22 135 L138 135 L138 170 C138 185 125 193 80 193 C35 193 22 185 22 170 Z" fill="#A3E635" opacity="0.85" />
            {/* Gold Overtime Fill (Middle) */}
            <rect x="22" y="90" width="116" height="45" fill="#FBBF24" opacity="0.85" />
            {/* Red Deductions Ribbon (Top) */}
            <rect x="22" y="80" width="116" height="10" fill="#FF5A4F" opacity="0.8" />
            {/* Jar Reflection Highlights */}
            <path d="M30 65 L30 165" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 pointer-events-none">
            <span className="text-xs uppercase font-extrabold tracking-wider text-black bg-lime px-2 py-0.5 rounded shadow">
              Total Net Pay
            </span>
            <span className="text-3xl font-black text-text mt-1">₹{netEarnings}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 w-full text-center text-xs pt-1">
          <div className="p-2 rounded-xl bg-lime/10 border border-lime/30">
            <span className="text-grey-300 block">{t('money.base_pay')}</span>
            <span className="font-extrabold text-lime text-sm">₹{totalBasePay}</span>
          </div>
          <div className="p-2 rounded-xl bg-warn/10 border border-warn/30">
            <span className="text-grey-300 block">{t('money.overtime_pay')}</span>
            <span className="font-extrabold text-warn text-sm">₹{totalOvertime}</span>
          </div>
          <div className="p-2 rounded-xl bg-danger/10 border border-danger/30">
            <span className="text-grey-300 block">{t('money.deductions')}</span>
            <span className="font-extrabold text-danger text-sm">-₹{totalDeductions}</span>
          </div>
        </div>

        {totalUnpaidGap > 0 && (
          <div className="w-full p-3 rounded-xl bg-danger/10 border border-danger/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-danger font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Unpaid Wage Gap Detected</span>
            </div>
            <span className="font-extrabold text-danger text-sm">₹{totalUnpaidGap}</span>
          </div>
        )}
      </Card>

      {/* Work Receipts List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-grey-500">
          {t('money.receipts_title')} (Tap card to review)
        </h2>

        {receipts.map((rcpt) => (
          <button
            key={rcpt.id}
            type="button"
            onClick={() => setSelectedReceipt(rcpt)}
            className="glass-card w-full p-4 text-start space-y-3 hover:border-grey-500 transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-lime"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-text">
                <Calendar className="w-4 h-4 text-lime" />
                <span>{rcpt.shiftDate}</span>
              </div>
              <Chip
                status={rcpt.status === 'MATCH' ? 'MATCH' : 'NEEDS_REVIEW'}
                label={rcpt.status === 'MATCH' ? t('money.chip_match') : t('money.chip_needs_review')}
              />
            </div>

            {/* Three Rows: Agreed, Worked, Paid */}
            <div className="space-y-1.5 text-xs border-y border-grey-700/40 py-2">
              <div className="flex justify-between">
                <span className="text-grey-500">{t('money.agreed')}</span>
                <span className="font-semibold text-text">{rcpt.agreed.hours}h @ ₹{rcpt.agreed.ratePerHour}/h = ₹{rcpt.agreed.totalRupees}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-grey-300">{t('money.worked')}</span>
                <span className="text-lime">{rcpt.worked.hours}h @ ₹{rcpt.worked.ratePerHour}/h = ₹{rcpt.worked.totalRupees}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-grey-500">{t('money.paid')}</span>
                <span className={`font-semibold ${rcpt.status === 'MATCH' ? 'text-text' : 'text-danger font-bold'}`}>
                  {rcpt.paid.hours}h = ₹{rcpt.paid.totalRupees}
                </span>
              </div>
            </div>

            <p className="text-xs text-grey-300">{rcpt.explanation}</p>
          </button>
        ))}
      </div>

      {/* Work Receipt Detail Modal with 4 Action Buttons */}
      <Modal
        isOpen={!!selectedReceipt && !isCorrectionModalOpen}
        onClose={() => setSelectedReceipt(null)}
        title="Work Receipt Review"
      >
        {selectedReceipt && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-grey-900 border border-grey-700 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-grey-500">Shift Date</span>
                <span className="font-bold">{selectedReceipt.shiftDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-grey-500">Discrepancy</span>
                <span className="font-extrabold text-danger">
                  {selectedReceipt.hourDifference}h / ₹{selectedReceipt.rupeeDifference} gap
                </span>
              </div>
              <p className="text-xs text-grey-300 pt-1 border-t border-grey-800">
                {selectedReceipt.explanation}
              </p>
            </div>

            {/* Four Buttons as specified in Prompt 7 */}
            <div className="space-y-2.5 pt-2">
              <Button
                variant="primary"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => handleAction('correction')}
              >
                <Send className="w-5 h-5" />
                <span>{t('money.btn_ask_correction')}</span>
              </Button>

              <Button
                variant="secondary"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => handleAction('group')}
              >
                <Users className="w-5 h-5 text-lime" />
                <span>{t('money.btn_add_group_count')}</span>
              </Button>

              <Button
                variant="secondary"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => handleAction('private')}
              >
                <Lock className="w-5 h-5 text-grey-300" />
                <span>{t('money.btn_keep_private')}</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full flex items-center justify-center gap-2 text-grey-300"
                onClick={() => handleAction('agree')}
              >
                <FileCheck className="w-5 h-5 text-grey-300" />
                <span>{t('money.btn_agree_close')}</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Ask for a Correction Sub-Modal */}
      <Modal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        title={t('money.btn_ask_correction')}
      >
        <div className="space-y-4">
          <p className="text-sm text-grey-300">
            Submit an explanation for your thekedar. This creates an open correction item in their dashboard.
          </p>
          <textarea
            rows={3}
            value={correctionNote}
            onChange={(e) => setCorrectionNote(e.target.value)}
            placeholder="Explain why you worked extra hours (e.g., Cleaned third floor flood until 5 PM)..."
            className="w-full p-3 rounded-xl bg-grey-900 border border-grey-700 text-text placeholder-grey-500 text-sm focus:outline-none focus:ring-2 focus:ring-lime"
          />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsCorrectionModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmitCorrection} className="flex-1">
              Send request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
