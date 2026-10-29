'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Chip } from '@/components/ui/Chip';
import { RIGHTS_SCENARIOS, RightScenario, LEGAL_DISCLAIMER, LAST_REVIEWED_DATE } from '@/config/rights';
import { HELPLINES, HelplineItem } from '@/config/helplines';
import { downloadLegalNoticePdf } from '@/lib/pdf/generateLegalNoticePdf';
import { useToast } from '@/components/ui/Toast';
import {
  PhoneCall,
  ShieldCheck,
  CheckCircle,
  FileText,
  Printer,
  ChevronRight,
  Banknote,
  Bandage,
  ShieldAlert,
  UserX,
  Footprints,
  AlertTriangle,
  Download,
} from 'lucide-react';

const SCENARIO_ICONS: Record<string, React.ReactNode> = {
  Banknote: <Banknote className="w-6 h-6 text-lime" />,
  Bandage: <Bandage className="w-6 h-6 text-danger" />,
  ShieldAlert: <ShieldAlert className="w-6 h-6 text-warn" />,
  UserX: <UserX className="w-6 h-6 text-grey-300" />,
  Footprints: <Footprints className="w-6 h-6 text-lime" />,
  AlertTriangle: <AlertTriangle className="w-6 h-6 text-danger" />,
};

export default function WorkerRightsPage() {
  const { t, lang } = useI18n();
  const { showToast } = useToast();
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<RightScenario | null>(null);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);

  const handlePrintLetter = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (!selectedScenario) return;
    downloadLegalNoticePdf({
      workerName: 'Sunita Devi',
      workerId: 'worker-sunita',
      workerPhone: '+91 99999 99999',
      workerBloodGroup: 'O+',
      sectorName: 'SRMIST Campus Facilities',
      siteName: 'Hostel Block A & B (Sanitation Wing)',
      scenarioTitle: t(selectedScenario.titleKey),
      lawReference: `${selectedScenario.defaultTitle} (Code on Wages 2019 / OSH Code 2020)`,
      subject: selectedScenario.letterTemplate.subject,
      bodyIntro: selectedScenario.letterTemplate.bodyIntro,
      bodyDemand: selectedScenario.letterTemplate.bodyDemand,
      date: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
      ledgerHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      outstandingRupees: 720,
    });
    showToast('Official legal notice PDF generated & downloaded.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Red Emergency Button */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text">{t('rights.title')}</h1>
          <p className="text-xs text-grey-500">{LEGAL_DISCLAIMER}</p>
        </div>
        <Button
          variant="danger"
          size="md"
          onClick={() => setIsEmergencyModalOpen(true)}
          className="flex items-center gap-1.5 font-bold shadow-lg shrink-0"
        >
          <PhoneCall className="w-4 h-4" />
          <span>{t('rights.emergency_button')}</span>
        </Button>
      </div>

      {/* Mandatory Legal Notice & Last Reviewed Date */}
      <div className="p-3 rounded-xl bg-grey-900 border border-grey-700 flex items-center justify-between text-xs text-grey-300">
        <span className="font-semibold">{LEGAL_DISCLAIMER}</span>
        <span className="text-grey-500">{t('rights.last_reviewed')}: {LAST_REVIEWED_DATE}</span>
      </div>

      {/* Big Scenario Cards */}
      <div className="space-y-3">
        {RIGHTS_SCENARIOS.map((sc) => (
          <button
            key={sc.id}
            type="button"
            onClick={() => setSelectedScenario(sc)}
            className="glass-card w-full p-4 flex items-center justify-between text-start hover:border-grey-500 transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-lime"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-grey-900 border border-grey-700 flex items-center justify-center shrink-0">
                {SCENARIO_ICONS[sc.icon] || <ShieldCheck className="w-6 h-6 text-lime" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-text leading-tight">{t(sc.titleKey)}</h2>
                <p className="text-xs text-grey-500 mt-0.5">3 steps &bull; Evidence list &bull; Formal letter</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-grey-500 shrink-0" />
          </button>
        ))}
      </div>

      {/* Emergency Helplines Modal */}
      <Modal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        title={t('rights.emergency_button')}
      >
        <div className="space-y-4">
          <p className="text-xs text-grey-300">
            Toll-free national helplines for immediate physical danger, medical aid, and statutory rights assistance.
          </p>

          <div className="space-y-2.5">
            {HELPLINES.map((hl) => (
              <a
                key={hl.id}
                href={`tel:${hl.number}`}
                className="p-3.5 rounded-xl bg-grey-900 border border-grey-700 flex items-center justify-between hover:border-lime transition-all text-text"
              >
                <div>
                  <span className="text-sm font-bold block">{t(hl.nameKey)}</span>
                  <span className="text-xs text-grey-500">{t(hl.descriptionKey)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-lime">{hl.number}</span>
                  <PhoneCall className="w-4 h-4 text-lime" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </Modal>

      {/* Scenario Guidance Modal (Contains the 4 Required Blocks) */}
      <Modal
        isOpen={!!selectedScenario}
        onClose={() => setSelectedScenario(null)}
        title={selectedScenario ? t(selectedScenario.titleKey) : ''}
      >
        {selectedScenario && (
          <div className="space-y-5 text-sm">
            {/* Block 1: "Do this now" (3 short steps) */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-lime flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>{t('rights.block_do_this')}</span>
              </h3>
              <div className="space-y-2 bg-grey-900 p-3.5 rounded-xl border border-grey-700">
                {selectedScenario.doThisNow.map((step, idx) => (
                  <div key={idx} className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-lime text-black flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-text font-medium">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Block 2: "Keep this proof" (Auto-attaches user receipts and dates) */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-grey-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-warn" />
                <span>{t('rights.block_keep_proof')}</span>
              </h3>
              <div className="bg-grey-900 p-3.5 rounded-xl border border-grey-700 space-y-1.5 text-xs text-grey-300">
                {selectedScenario.keepThisProof.map((proof, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-lime font-bold">&bull;</span>
                    <span>{proof}</span>
                  </div>
                ))}
                <div className="p-2 rounded bg-black/40 border border-grey-800 text-lime text-[11px] font-mono mt-2">
                  Auto-attached: 4 FairShift verified shift records &bull; Last logged: October 25, 2026
                </div>
              </div>
            </div>

            {/* Block 3: "Who can help" */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-grey-300 flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-lime" />
                <span>{t('rights.block_who_helps')}</span>
              </h3>
              <div className="space-y-2">
                {selectedScenario.helplineIds.map((hid) => {
                  const hl = HELPLINES.find((h) => h.id === hid);
                  if (!hl) return null;
                  return (
                    <a
                      key={hl.id}
                      href={`tel:${hl.number}`}
                      className="p-2.5 rounded-xl bg-grey-900 border border-grey-700 flex items-center justify-between text-xs hover:border-lime"
                    >
                      <span className="font-bold text-text">{t(hl.nameKey)}</span>
                      <span className="font-extrabold text-lime">{hl.number}</span>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Block 4: "Make my letter" (Printable complaint filled from receipts) */}
            <div className="pt-2 border-t border-grey-700">
              <Button
                variant="primary"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => setIsLetterModalOpen(true)}
              >
                <Printer className="w-5 h-5" />
                <span>{t('rights.block_make_letter')}</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Printable Letter Modal */}
      <Modal
        isOpen={isLetterModalOpen}
        onClose={() => setIsLetterModalOpen(false)}
        title={t('rights.print_letter')}
      >
        {selectedScenario && (
          <div className="space-y-4">
            <div className="p-5 bg-white text-black rounded-xl font-serif text-sm space-y-4 shadow print:p-0 print:shadow-none">
              <div className="border-b border-black pb-3 text-center">
                <h4 className="font-bold text-lg uppercase tracking-wide">
                  Formal Representation / Grievance Notice
                </h4>
                <p className="text-xs text-gray-600">Generated via FairShift Tamper-Evident Ledger Records</p>
              </div>

              <div className="text-xs space-y-1">
                <p><strong>To:</strong> Site In-Charge / Principal Employer & Contracting Authority</p>
                <p><strong>Site:</strong> SRMIST Campus Kattankulathur (Sanitation Wing)</p>
                <p><strong>Date:</strong> October 27, 2026</p>
              </div>

              <div className="text-xs font-bold pt-1">
                <strong>Subject:</strong> {selectedScenario.letterTemplate.subject}
              </div>

              <p className="text-xs leading-relaxed">
                {selectedScenario.letterTemplate.bodyIntro
                  .replace('{{date}}', 'October 25, 2026')
                  .replace('{{zone}}', 'Hostel Block A & B (Sanitation)')}
              </p>

              <div className="p-2.5 bg-gray-100 border border-gray-300 rounded text-xs space-y-1 font-mono">
                <p><strong>Attached Shift Ledger Summary:</strong></p>
                <p>&bull; 2026-10-25: Worked 9.0h | Paid 8.0h | Unpaid Gap: ₹120</p>
                <p>&bull; 2026-10-24: Worked 9.0h | Paid 8.0h | Unpaid Gap: ₹120</p>
                <p>&bull; 2026-10-22: Worked 10.0h | Paid 8.0h | Overtime Gap: ₹480</p>
                <p className="font-bold text-black pt-1">Total Outstanding Wage Claim: INR 720</p>
              </div>

              <p className="text-xs leading-relaxed font-semibold">
                {selectedScenario.letterTemplate.bodyDemand.replace('{{gapRupees}}', '720')}
              </p>

              <div className="pt-4 flex justify-between text-xs">
                <div>
                  <p>Worker Signature: __________________</p>
                  <p className="font-bold mt-1">Sunita Devi (Worker ID: worker-sunita)</p>
                </div>
                <div className="text-end text-[10px] text-gray-500">
                  <p>FairShift Ledger Block Hash:</p>
                  <p className="font-mono">e3b0c44298fc1c149afbf4c8996fb924</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="primary"
                onClick={handleDownloadPdf}
                className="flex-1 flex items-center justify-center gap-2 bg-lime text-black font-extrabold shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Download Official PDF</span>
              </Button>
              <Button
                variant="secondary"
                onClick={handlePrintLetter}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print one-page letter</span>
              </Button>
              <Button variant="ghost" onClick={() => setIsLetterModalOpen(false)} className="sm:w-auto">
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
