'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { useToast } from '@/components/ui/Toast';
import { SECTORS } from '@/config/sectors';
import { SEED_USERS, SEED_HAZARDS, SEED_COMPLAINTS, SEED_CORRECTIONS } from '@/lib/storage/seedData';
import { evaluateEscrowGroup } from '@/core/escrow';
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  Users,
  Download,
  Building2,
  HardHat,
  Stethoscope,
  TrendingUp,
  Clock,
  CheckCircle2,
  Megaphone,
  Printer,
  ChevronRight,
  LogOut,
  Flame,
  FileSpreadsheet,
  Eye,
  Check,
  X,
  Camera,
  MapPin,
  ShieldAlert,
  ThermometerSun,
  Activity,
  AlertOctagon,
  RefreshCw,
  Search,
} from 'lucide-react';

interface WorkerRosterItem {
  id: string;
  name: string;
  sectorId: string;
  zone: string;
  shiftStart: string;
  hoursWorked: number;
  standardHours: number;
  restHoursBeforeShift: number; // violation if < 10h
  coords: { lat: number; lon: number };
  safetyPhotoStatus: 'VERIFIED' | 'PENDING' | 'FLAGGED';
  safetyPhotoUrl?: string;
  safetyPhotoTimestamp?: string;
  ppeItems: { name: string; verified: boolean }[];
  phone: string;
  bloodGroup: string;
  age: string;
  weight: string;
  height: string;
}

const DEFAULT_PPE_SVGS: Record<string, string> = {
  'worker-sunita':
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="%23101310"/><circle cx="160" cy="110" r="50" fill="%23f59e0b"/><rect x="120" y="70" width="80" height="28" rx="8" fill="%23a3e635"/><path d="M70,290 C70,180 250,180 250,290 Z" fill="%2322c55e"/><rect x="130" y="190" width="60" height="90" fill="%23facc15"/><text x="160" y="305" text-anchor="middle" fill="%23a3e635" font-size="12" font-family="sans-serif" font-weight="bold">Sunita Devi (PPE VERIFIED)</text></svg>',
  'worker-rajesh':
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="%23101310"/><circle cx="160" cy="110" r="50" fill="%23d97706"/><rect x="125" y="70" width="70" height="24" rx="8" fill="%23eab308"/><path d="M70,290 C70,180 250,180 250,290 Z" fill="%233b82f6"/><rect x="135" y="190" width="50" height="90" fill="%23eab308"/><text x="160" y="305" text-anchor="middle" fill="%23ff5a4f" font-size="12" font-family="sans-serif" font-weight="bold">Rajesh Kumar (MISSING GLOVES)</text></svg>',
  'worker-priya':
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="%23101310"/><circle cx="160" cy="110" r="50" fill="%23f59e0b"/><rect x="120" y="70" width="80" height="28" rx="8" fill="%23a3e635"/><path d="M70,290 C70,180 250,180 250,290 Z" fill="%2310b981"/><rect x="130" y="190" width="60" height="90" fill="%23facc15"/><text x="160" y="305" text-anchor="middle" fill="%23a3e635" font-size="12" font-family="sans-serif" font-weight="bold">Priya Nair (PPE VERIFIED)</text></svg>',
  'worker-amit':
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="%23101310"/><circle cx="160" cy="110" r="50" fill="%23eab308"/><rect x="110" y="65" width="100" height="32" rx="10" fill="%23fbbf24"/><path d="M60,290 C60,175 260,175 260,290 Z" fill="%23f97316"/><rect x="125" y="180" width="70" height="100" fill="%23fde047"/><text x="160" y="305" text-anchor="middle" fill="%23fbbf24" font-size="12" font-family="sans-serif" font-weight="bold">Amit Verma (INSPECTION PENDING)</text></svg>',
};

export default function AdminCommandCockpitPage() {
  const { t } = useI18n();
  const { showToast } = useToast();

  const [activeSectorId, setActiveSectorId] = useState('srmist');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'roster' | 'paygaps' | 'safety' | 'voice' | 'overtime' | 'contractors' | 'people' | 'compliance'
  >('overview');

  // Selected worker for safety gear inspection modal
  const [inspectingWorker, setInspectingWorker] = useState<WorkerRosterItem | null>(null);

  // Search & Filter in roster
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterFilter, setRosterFilter] = useState<'all' | 'flagged' | 'overtime' | 'verified'>('all');

  // Live Roster State
  const [roster, setRoster] = useState<WorkerRosterItem[]>([
    {
      id: 'worker-sunita',
      name: 'Sunita Devi',
      sectorId: 'srmist',
      zone: 'Hostel Block A & B (Sanitation)',
      shiftStart: '08:00 AM',
      hoursWorked: 7.5,
      standardHours: 8.0,
      restHoursBeforeShift: 11.5,
      coords: { lat: 12.8234, lon: 80.0451 },
      safetyPhotoStatus: 'VERIFIED',
      safetyPhotoTimestamp: '08:02 AM',
      ppeItems: [
        { name: 'Sanitation Heavy-Duty Gloves', verified: true },
        { name: 'Reflective Safety Apron / High-Vis', verified: true },
        { name: 'Slip-Resistant Work Boots', verified: true },
      ],
      phone: '+91 98765 43210',
      bloodGroup: 'O+',
      age: '32',
      weight: '58 kg',
      height: '162 cm',
    },
    {
      id: 'worker-rajesh',
      name: 'Rajesh Kumar',
      sectorId: 'srmist',
      zone: 'Hostel Block A',
      shiftStart: '07:30 AM',
      hoursWorked: 9.2, // OVERTIME >8h
      standardHours: 8.0,
      restHoursBeforeShift: 8.2, // CRITICAL: <10h rest violation!
      coords: { lat: 12.8236, lon: 80.0453 },
      safetyPhotoStatus: 'FLAGGED', // missing gloves
      safetyPhotoTimestamp: '07:35 AM',
      ppeItems: [
        { name: 'Sanitation Heavy-Duty Gloves', verified: false },
        { name: 'Reflective Safety Apron / High-Vis', verified: true },
        { name: 'Slip-Resistant Work Boots', verified: true },
      ],
      phone: '+91 98765 43211',
      bloodGroup: 'B+',
      age: '29',
      weight: '64 kg',
      height: '168 cm',
    },
    {
      id: 'worker-priya',
      name: 'Priya Nair',
      sectorId: 'srmist',
      zone: 'Hostel Block B',
      shiftStart: '08:15 AM',
      hoursWorked: 4.5,
      standardHours: 8.0,
      restHoursBeforeShift: 12.0,
      coords: { lat: 12.8239, lon: 80.0448 },
      safetyPhotoStatus: 'VERIFIED',
      safetyPhotoTimestamp: '08:16 AM',
      ppeItems: [
        { name: 'Sanitation Heavy-Duty Gloves', verified: true },
        { name: 'Reflective Safety Apron / High-Vis', verified: true },
        { name: 'Slip-Resistant Work Boots', verified: true },
      ],
      phone: '+91 98765 43212',
      bloodGroup: 'A+',
      age: '26',
      weight: '52 kg',
      height: '158 cm',
    },
    {
      id: 'worker-amit',
      name: 'Amit Verma',
      sectorId: 'metro',
      zone: 'Pillar 142-148 (Rebar Tying)',
      shiftStart: '07:00 AM',
      hoursWorked: 9.5, // CRITICAL OVERTIME >8h
      standardHours: 8.0,
      restHoursBeforeShift: 9.0, // <10h rest violation!
      coords: { lat: 13.0827, lon: 80.2707 },
      safetyPhotoStatus: 'PENDING',
      safetyPhotoTimestamp: '07:05 AM',
      ppeItems: [
        { name: 'Hard Hat (ISI Mark)', verified: true },
        { name: 'High-Vis Vest (Class 3)', verified: true },
        { name: 'Steel-Toe Boots (IS 15298)', verified: false },
      ],
      phone: '+91 98765 43214',
      bloodGroup: 'O-',
      age: '35',
      weight: '72 kg',
      height: '174 cm',
    },
    {
      id: 'worker-manpreet',
      name: 'Manpreet Singh',
      sectorId: 'metro',
      zone: 'Viaduct Segment 3',
      shiftStart: '08:00 AM',
      hoursWorked: 6.0,
      standardHours: 8.0,
      restHoursBeforeShift: 13.0,
      coords: { lat: 13.0831, lon: 80.2712 },
      safetyPhotoStatus: 'VERIFIED',
      safetyPhotoTimestamp: '08:04 AM',
      ppeItems: [
        { name: 'Hard Hat (ISI Mark)', verified: true },
        { name: 'High-Vis Vest (Class 3)', verified: true },
        { name: 'Steel-Toe Boots (IS 15298)', verified: true },
      ],
      phone: '+91 98765 43215',
      bloodGroup: 'AB+',
      age: '31',
      weight: '78 kg',
      height: '179 cm',
    },
    {
      id: 'worker-kavita',
      name: 'Kavita Shinde',
      sectorId: 'hospital',
      zone: 'ICU Bio-Waste Corridor',
      shiftStart: '08:00 AM',
      hoursWorked: 6.8,
      standardHours: 8.0,
      restHoursBeforeShift: 11.0,
      coords: { lat: 12.9815, lon: 80.218 },
      safetyPhotoStatus: 'VERIFIED',
      safetyPhotoTimestamp: '08:03 AM',
      ppeItems: [
        { name: 'N95 Respirator Mask', verified: true },
        { name: 'Sterile Biohazard Apron', verified: true },
        { name: 'Double Nitrile Gloves', verified: true },
      ],
      phone: '+91 98765 43216',
      bloodGroup: 'B-',
      age: '28',
      weight: '55 kg',
      height: '160 cm',
    },
  ]);

  // Sync latest live photo from worker session if saved in localStorage
  useEffect(() => {
    try {
      const savedPpe = localStorage.getItem('fairshift_latest_checkin_ppe');
      if (savedPpe) {
        const parsed = JSON.parse(savedPpe);
        setRoster((prev) =>
          prev.map((w) =>
            w.id === 'worker-sunita'
              ? {
                  ...w,
                  safetyPhotoUrl: parsed.photo || w.safetyPhotoUrl,
                  safetyPhotoTimestamp: parsed.timestamp || w.safetyPhotoTimestamp,
                  safetyPhotoStatus: (parsed.status as any) || 'VERIFIED',
                  coords: parsed.coords || w.coords,
                }
              : w
          )
        );
      }

      // Sync worker health vitals if stored
      const blood = localStorage.getItem('fairshift_worker_blood');
      const age = localStorage.getItem('fairshift_worker_age');
      const weight = localStorage.getItem('fairshift_worker_weight');
      const height = localStorage.getItem('fairshift_worker_height');
      if (blood || age || weight || height) {
        setRoster((prev) =>
          prev.map((w) =>
            w.id === 'worker-sunita'
              ? {
                  ...w,
                  bloodGroup: blood || w.bloodGroup,
                  age: age || w.age,
                  weight: weight ? `${weight} kg` : w.weight,
                  height: height ? `${height} cm` : w.height,
                }
              : w
          )
        );
      }
    } catch {
      // Ignore quota or parsing error in demo
    }
  }, []);

  const currentSector = SECTORS[activeSectorId] || SECTORS.srmist;

  // Impact metrics
  const rupeesRecovered = 18450;
  const hazardsFixed = 14;
  const restHoursProtected = 328;
  const decentWorkIndex = 87; // SDG 8 target composite score

  // Voice: Only show unlocked collective alerts (locked complaints are strictly hidden!)
  const unlockedComplaints = SEED_COMPLAINTS.filter((c) => {
    const group = SEED_COMPLAINTS.filter((item) => item.targetId === c.targetId);
    const evalResult = evaluateEscrowGroup(c.targetId, group);
    return evalResult.isUnlocked;
  });

  const handleDownloadCsv = (type: 'muster' | 'overtime' | 'wage') => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (type === 'muster') {
      csvContent += 'Worker ID,Name,Sector,Zone,Muster Date,Status,Verified By,Working Hours,Rest Hours,PPE Status\n';
      roster.forEach((w) => {
        csvContent += `${w.id},${w.name},${w.sectorId},${w.zone},2026-10-30,PRESENT,Two-Key Shift,${w.hoursWorked},${w.restHoursBeforeShift},${w.safetyPhotoStatus}\n`;
      });
    } else if (type === 'overtime') {
      csvContent += 'Worker ID,Name,Date,Standard Hours,Overtime Hours,Overtime Multiplier,Pay Due (INR)\n';
      csvContent += 'worker-sunita,Sunita Devi,2026-10-22,8.0,2.0,2.0x,480\n';
      csvContent += 'worker-amit,Amit Verma,2026-10-24,8.0,3.0,2.0x,960\n';
      csvContent += 'worker-rajesh,Rajesh Kumar,2026-10-30,8.0,1.2,2.0x,384\n';
    } else {
      csvContent += 'Worker ID,Name,Gross Wages,Overtime,Deductions,Net Disbursed,Receipt Status\n';
      csvContent += 'worker-sunita,Sunita Devi,1080,240,50,1270,MATCH\n';
      csvContent += 'worker-priya,Priya Nair,960,0,0,960,MATCH\n';
      csvContent += 'worker-rajesh,Rajesh Kumar,960,384,0,1344,MATCH\n';
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FairShift_${type}_register_${activeSectorId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Downloaded ${type} register as statutory CSV.`, 'success');
  };

  // PPE Approval Action
  const handleApprovePpe = (workerId: string) => {
    setRoster((prev) =>
      prev.map((w) =>
        w.id === workerId
          ? {
              ...w,
              safetyPhotoStatus: 'VERIFIED',
              ppeItems: w.ppeItems.map((item) => ({ ...item, verified: true })),
            }
          : w
      )
    );
    showToast(`Approved PPE compliance for ${inspectingWorker?.name}. Shift certified.`, 'success');
    setInspectingWorker(null);
  };

  // PPE Flag Action
  const handleFlagPpe = (workerId: string) => {
    setRoster((prev) =>
      prev.map((w) =>
        w.id === workerId
          ? {
              ...w,
              safetyPhotoStatus: 'FLAGGED',
            }
          : w
      )
    );
    showToast(`Flagged safety violation for ${inspectingWorker?.name}. Supervisor alerted.`, 'error');
    setInspectingWorker(null);
  };

  // Filtered Roster
  const filteredRoster = roster.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      w.zone.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      w.phone.includes(rosterSearch);
    if (!matchesSearch) return false;

    if (rosterFilter === 'flagged') return w.safetyPhotoStatus === 'FLAGGED' || w.restHoursBeforeShift < 10;
    if (rosterFilter === 'overtime') return w.hoursWorked > w.standardHours;
    if (rosterFilter === 'verified') return w.safetyPhotoStatus === 'VERIFIED';
    return true;
  });

  // Calculate live critical telemetry alerts
  const restViolations = roster.filter((w) => w.restHoursBeforeShift < 10);
  const overtimeShifts = roster.filter((w) => w.hoursWorked > w.standardHours);
  const ppeNonCompliant = roster.filter((w) => w.safetyPhotoStatus === 'FLAGGED');
  const ppePending = roster.filter((w) => w.safetyPhotoStatus === 'PENDING');

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen bg-black text-text">
      {/* Desktop Left Sidebar */}
      <aside className="w-full md:w-64 bg-obsidian border-b md:border-b-0 md:border-r border-grey-800 p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-2">
            <img
              src="/images/hisaab-logo.jpg"
              alt="Hisaab Logo"
              className="w-8 h-8 rounded-xl object-contain bg-white p-0.5 border border-lime/50 shadow"
            />
            <div>
              <span className="font-extrabold text-lg text-text block leading-none">FairShift Hisaab</span>
              <span className="text-[10px] font-bold text-grey-500 uppercase tracking-widest">
                Command Cockpit
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Overview & SDG 8', icon: TrendingUp },
              { id: 'roster', label: 'Active Roster & Hours', icon: Users, badge: `${roster.length}` },
              { id: 'paygaps', label: 'Pay Gaps Queue', icon: Scale, badge: '2' },
              { id: 'safety', label: 'Safety & Clock SLAs', icon: ShieldCheck, badge: '1 SLA' },
              { id: 'voice', label: 'Collective Voice Vault', icon: Megaphone },
              { id: 'overtime', label: 'Consensus Overtime', icon: Clock },
              { id: 'contractors', label: 'Thekedar Scorecards', icon: Building2 },
              { id: 'people', label: 'Burnout & Risk Radar', icon: Flame },
              { id: 'compliance', label: 'Inspection Pack', icon: FileSpreadsheet },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all text-start ${
                    isActive
                      ? 'bg-lime text-black shadow'
                      : 'text-grey-300 hover:text-text hover:bg-grey-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                        isActive ? 'bg-black text-lime' : 'bg-grey-800 text-grey-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-grey-800 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-1.5 text-grey-500 hover:text-danger font-bold">
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </Link>
            <span className="text-[10px] text-grey-600">UN SDG 8</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-grey-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse shrink-0" />
            <span className="truncate">MongoDB: vaibhavnr06@gmail.com</span>
          </div>
        </div>
      </aside>

      {/* Main Command Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header Bar with Sector Switcher, Theme & Language */}
        <header className="p-4 sm:px-8 border-b border-grey-800 bg-obsidian/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase text-grey-500">Sector Profile:</label>
            <select
              value={activeSectorId}
              onChange={(e) => {
                setActiveSectorId(e.target.value);
                showToast(`Switched workplace sector to ${SECTORS[e.target.value]?.name}`, 'info');
              }}
              className="bg-grey-900 border border-grey-700 text-lime font-bold text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-lime cursor-pointer"
            >
              <option value="srmist">SRMIST Campus Facility & Hostel Staff</option>
              <option value="metro">Metro Rail Construction (Line 4)</option>
              <option value="hospital">District General Hospital Support</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </header>

        {/* Content Body */}
        <main className="p-4 sm:p-8 space-y-8 flex-1 max-w-6xl w-full mx-auto">
          {/* CRITICAL WARNING CENTER: WHAT EVERY ADMIN MUST KNOW (Pinned at top across tabs or in overview) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-danger animate-pulse" />
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-text">
                  Critical Warning Center &bull; What Every Admin Must Know
                </h2>
              </div>
              <span className="text-xs text-grey-500 font-mono">Real-time Telemetry</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Alert 1: Rest Violations */}
              <div
                onClick={() => {
                  setActiveTab('roster');
                  setRosterFilter('flagged');
                }}
                className="p-3.5 rounded-2xl bg-danger/10 border-2 border-danger/40 hover:border-danger transition-all cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-danger uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Rest Deficit
                  </span>
                  <span className="text-xs font-extrabold px-1.5 py-0.5 rounded bg-danger text-black">
                    {restViolations.length} ALERTS
                  </span>
                </div>
                <p className="text-sm font-bold text-text">
                  {restViolations.map((w) => w.name).join(', ')} had &lt;10h rest
                </p>
                <p className="text-[11px] text-grey-400">
                  Statutory violation under OSH Code 2020. Mandatory 10h interval violated.
                </p>
              </div>

              {/* Alert 2: Overtime Outliers */}
              <div
                onClick={() => {
                  setActiveTab('roster');
                  setRosterFilter('overtime');
                }}
                className="p-3.5 rounded-2xl bg-warn/10 border-2 border-warn/40 hover:border-warn transition-all cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-warn uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Overtime Outliers
                  </span>
                  <span className="text-xs font-extrabold px-1.5 py-0.5 rounded bg-warn text-black">
                    {overtimeShifts.length} WORKERS
                  </span>
                </div>
                <p className="text-sm font-bold text-text">
                  Shifts exceeding 8.0h ({overtimeShifts.map((w) => `${w.name} ${w.hoursWorked}h`).join(', ')})
                </p>
                <p className="text-[11px] text-grey-400">
                  Requires 2x statutory overtime rate authorization.
                </p>
              </div>

              {/* Alert 3: PPE Safety Non-Compliance */}
              <div
                onClick={() => {
                  setActiveTab('roster');
                  setRosterFilter('flagged');
                }}
                className="p-3.5 rounded-2xl bg-danger/10 border-2 border-danger/40 hover:border-danger transition-all cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-danger uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Safety Gear Flags
                  </span>
                  <span className="text-xs font-extrabold px-1.5 py-0.5 rounded bg-danger text-black">
                    {ppeNonCompliant.length + ppePending.length} ON-SITE
                  </span>
                </div>
                <p className="text-sm font-bold text-text">
                  1 Missing PPE, 1 Pending Inspection
                </p>
                <p className="text-[11px] text-grey-400">
                  Chemical gloves missing on active shift. Click to inspect photo evidence.
                </p>
              </div>

              {/* Alert 4: Hazard SLA Clock & NOAA Heat */}
              <div
                onClick={() => setActiveTab('safety')}
                className="p-3.5 rounded-2xl bg-lime/10 border-2 border-lime/40 hover:border-lime transition-all cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-lime uppercase tracking-wider flex items-center gap-1.5">
                    <ThermometerSun className="w-3.5 h-3.5" /> SLA & Heat Clock
                  </span>
                  <span className="text-xs font-extrabold px-1.5 py-0.5 rounded bg-lime text-black">
                    42 MIN SLA
                  </span>
                </div>
                <p className="text-sm font-bold text-text">
                  Hostel Block A Electrical Leakage
                </p>
                <p className="text-[11px] text-grey-400">
                  Heat index 42°C. Mandatory 15-min hydration break every 45 min in effect.
                </p>
              </div>
            </div>
          </div>

          {/* TAB 1: OVERVIEW & SDG 8 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-text">Workplace Fairness Impact</h2>
                <p className="text-sm text-grey-300">
                  Measuring real-time compliance with UN SDG 8: Decent Work & Economic Growth
                </p>
              </div>

              {/* Impact Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-grey-500 block">
                    Decent Work Index
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-black text-lime">{decentWorkIndex}</span>
                    <span className="text-sm font-semibold text-lime">/ 100</span>
                  </div>
                  <p className="text-xs text-grey-300 mt-2">Mapped to SDG 8.5 & 8.8 Targets</p>
                </Card>

                <Card className="p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-grey-500 block">
                    Wages Reconciled
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-black text-text">₹{rupeesRecovered}</span>
                  </div>
                  <p className="text-xs text-grey-300 mt-2">Zero unacknowledged arrears</p>
                </Card>

                <Card className="p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-grey-500 block">
                    Hazards Verifiably Fixed
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-black text-lime">{hazardsFixed}</span>
                    <span className="text-sm text-grey-300">closed</span>
                  </div>
                  <p className="text-xs text-grey-300 mt-2">100% Two-Key worker authenticated</p>
                </Card>

                <Card className="p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-grey-500 block">
                    Rest Hours Protected
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-black text-text">{restHoursProtected}h</span>
                  </div>
                  <p className="text-xs text-grey-300 mt-2">Mandatory 10h rest enforced</p>
                </Card>
              </div>

              {/* Live Working Hours Summary Glance */}
              <Card className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-text">Live Shift Roster & Working Hours Pulse</h3>
                    <p className="text-xs text-grey-400">
                      Tracking active shifts, daily hours logged, and safety gear verification status.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setActiveTab('roster')}
                    className="self-start sm:self-auto min-h-0 h-10 px-4 text-sm"
                  >
                    View All {roster.length} Workers & Hours &rarr;
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-grey-900 border border-grey-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-grey-400 block">Active On Site</span>
                      <span className="text-xl font-bold text-lime">{roster.length} Personnel</span>
                    </div>
                    <Users className="w-6 h-6 text-lime/70" />
                  </div>

                  <div className="p-3 rounded-xl bg-grey-900 border border-grey-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-grey-400 block">PPE Compliance Rate</span>
                      <span className="text-xl font-bold text-text">
                        {Math.round(((roster.length - ppeNonCompliant.length) / roster.length) * 100)}%
                      </span>
                    </div>
                    <ShieldCheck className="w-6 h-6 text-lime/70" />
                  </div>

                  <div className="p-3 rounded-xl bg-grey-900 border border-grey-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-grey-400 block">Overtime Hours Logged</span>
                      <span className="text-xl font-bold text-warn">
                        {roster.reduce((acc, w) => acc + Math.max(0, w.hoursWorked - w.standardHours), 0).toFixed(1)}h
                      </span>
                    </div>
                    <Clock className="w-6 h-6 text-warn/70" />
                  </div>
                </div>
              </Card>

              {/* SDG 8 Breakdown Graphic (Inline SVG) */}
              <Card className="p-6 space-y-4">
                <h3 className="text-lg font-bold text-text">UN SDG 8 Sub-Target Performance</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>Target 8.5: Equal Pay for Work of Equal Value</span>
                      <span className="text-lime">92%</span>
                    </div>
                    <div className="w-full h-3 bg-grey-900 rounded-full overflow-hidden">
                      <div className="h-full bg-lime rounded-full" style={{ width: '92%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>Target 8.8: Protect Labour Rights & Safe Working Environments</span>
                      <span className="text-lime">88%</span>
                    </div>
                    <div className="w-full h-3 bg-grey-900 rounded-full overflow-hidden">
                      <div className="h-full bg-lime rounded-full" style={{ width: '88%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>Target 8.7: Eradicate Forced & Precarious Undercompensated Labor</span>
                      <span className="text-lime">96%</span>
                    </div>
                    <div className="w-full h-3 bg-grey-900 rounded-full overflow-hidden">
                      <div className="h-full bg-lime rounded-full" style={{ width: '96%' }} />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: ACTIVE ROSTER & WORKING HOURS TELEMETRY */}
          {activeTab === 'roster' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-text">
                    Active Workforce & Working Hours Telemetry
                  </h2>
                  <p className="text-sm text-grey-300">
                    Audit-ready daily shift duration, statutory rest tracking, GPS geofence, and mandatory safety PPE inspection.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="md" onClick={() => handleDownloadCsv('muster')} className="min-h-0 h-10 px-4 text-sm">
                    <Download className="w-4 h-4 mr-1.5" />
                    Export Muster CSV
                  </Button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-obsidian rounded-2xl border border-grey-800">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-grey-500" />
                  <input
                    type="text"
                    placeholder="Search by worker name, zone, or phone..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-grey-900 border border-grey-700 rounded-xl text-sm text-text placeholder-grey-500 focus:outline-none focus:ring-2 focus:ring-lime"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: 'all', label: 'All Crew' },
                    { id: 'flagged', label: 'Flagged / Violations' },
                    { id: 'overtime', label: 'Overtime (>8h)' },
                    { id: 'verified', label: '100% Compliant' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setRosterFilter(filter.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        rosterFilter === filter.id
                          ? 'bg-lime text-black shadow'
                          : 'bg-grey-900 border border-grey-800 text-grey-400 hover:text-text'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Roster & Working Hours Table */}
              <div className="space-y-3">
                {filteredRoster.map((worker) => {
                  const isOvertime = worker.hoursWorked > worker.standardHours;
                  const isRestViolation = worker.restHoursBeforeShift < 10;
                  const photoThumbnail =
                    worker.safetyPhotoUrl || DEFAULT_PPE_SVGS[worker.id] || DEFAULT_PPE_SVGS['worker-sunita'];

                  return (
                    <Card
                      key={worker.id}
                      className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all ${
                        worker.safetyPhotoStatus === 'FLAGGED' || isRestViolation
                          ? 'border-danger/40 bg-danger/5'
                          : 'border-grey-800'
                      }`}
                    >
                      {/* Left: Worker Vitals & ID */}
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div
                          onClick={() => setInspectingWorker(worker)}
                          className="relative w-14 h-14 rounded-2xl bg-grey-900 border-2 border-grey-700 overflow-hidden shrink-0 cursor-pointer group hover:border-lime transition-all"
                          title="Click to inspect safety PPE photo"
                        >
                          <img
                            src={photoThumbnail}
                            alt={worker.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-5 h-5 text-lime" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-base text-text">{worker.name}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-grey-900 border border-grey-700 font-mono text-grey-300">
                              {worker.phone}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-lime/10 border border-lime/30 font-bold text-lime">
                              Blood: {worker.bloodGroup}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-grey-400">
                            <span className="flex items-center gap-1 text-grey-300">
                              <MapPin className="w-3.5 h-3.5 text-lime" />
                              {worker.zone}
                            </span>
                            <span>&bull;</span>
                            <span>Age: {worker.age}y</span>
                            <span>&bull;</span>
                            <span>BW: {worker.weight}</span>
                            <span>&bull;</span>
                            <span>Ht: {worker.height}</span>
                          </div>

                          <div className="text-[11px] text-grey-500 font-mono">
                            GPS Geofence: {worker.coords.lat}° N, {worker.coords.lon}° E (Verified on-site)
                          </div>
                        </div>
                      </div>

                      {/* Middle: Working Hours & Rest Analysis */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-grey-900/80 border border-grey-800 lg:w-[380px] shrink-0">
                        {/* Working Hours */}
                        <div>
                          <span className="text-[10px] uppercase font-bold text-grey-500 block">
                            Hours Today
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span
                              className={`text-lg font-black ${
                                isOvertime ? 'text-warn' : 'text-text'
                              }`}
                            >
                              {worker.hoursWorked}h
                            </span>
                            <span className="text-[11px] text-grey-500">/ 8h std</span>
                          </div>
                          {isOvertime && (
                            <span className="inline-block text-[10px] font-bold text-warn bg-warn/15 px-1 rounded mt-0.5">
                              +{(worker.hoursWorked - worker.standardHours).toFixed(1)}h Overtime
                            </span>
                          )}
                        </div>

                        {/* Prior Rest Interval */}
                        <div>
                          <span className="text-[10px] uppercase font-bold text-grey-500 block">
                            Rest Before Shift
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span
                              className={`text-lg font-black ${
                                isRestViolation ? 'text-danger' : 'text-lime'
                              }`}
                            >
                              {worker.restHoursBeforeShift}h
                            </span>
                            <span className="text-[11px] text-grey-500">
                              {isRestViolation ? 'VIOLATION' : 'OK'}
                            </span>
                          </div>
                          {isRestViolation ? (
                            <span className="inline-block text-[10px] font-bold text-danger bg-danger/15 px-1 rounded mt-0.5">
                              &lt;10h Law Minimum
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] font-bold text-lime/80 mt-0.5">
                              Compliant
                            </span>
                          )}
                        </div>

                        {/* Shift Start */}
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[10px] uppercase font-bold text-grey-500 block">
                            Shift In
                          </span>
                          <span className="text-sm font-bold text-text block mt-0.5">
                            {worker.shiftStart}
                          </span>
                          <span className="text-[10px] text-grey-500">2-Key Token</span>
                        </div>
                      </div>

                      {/* Right: Mandatory Safety Gear Status & Inspect Button */}
                      <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
                        <div className="text-end">
                          <span className="text-[10px] uppercase font-bold text-grey-500 block mb-0.5">
                            Safety PPE Photo
                          </span>
                          <Chip
                            status={
                              worker.safetyPhotoStatus === 'VERIFIED'
                                ? 'MATCH'
                                : worker.safetyPhotoStatus === 'PENDING'
                                ? 'OPEN'
                                : 'URGENT'
                            }
                            label={
                              worker.safetyPhotoStatus === 'VERIFIED'
                                ? 'PPE APPROVED'
                                : worker.safetyPhotoStatus === 'PENDING'
                                ? 'PENDING AUDIT'
                                : 'NON-COMPLIANT'
                            }
                          />
                        </div>

                        <Button
                          variant={worker.safetyPhotoStatus === 'FLAGGED' ? 'danger' : 'secondary'}
                          size="md"
                          onClick={() => setInspectingWorker(worker)}
                          className="flex items-center gap-1.5 min-h-0 h-9 px-3 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PAY GAPS QUEUE */}
          {activeTab === 'paygaps' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-text">Wage Discrepancy & Correction Queue</h2>
              <div className="space-y-3">
                {SEED_CORRECTIONS.map((c) => (
                  <Card key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg text-text">{c.workerName}</span>
                        <Chip status={c.status === 'PENDING' ? 'NEEDS_REVIEW' : 'MATCH'} label={c.status} />
                      </div>
                      <p className="text-xs text-grey-500">
                        Shift: {c.shiftDate} &bull; Claimed: {c.claimedHours}h vs Paid: {c.paidHours}h
                      </p>
                      <p className="text-sm text-grey-300 mt-1">&quot;{c.workerNote}&quot;</p>
                    </div>
                    <div className="text-end shrink-0">
                      <span className="text-xs text-grey-500 uppercase block">Pending Settlement</span>
                      <span className="text-2xl font-black text-danger">₹{c.claimedDifferenceRupees}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SAFETY & CLOCK SLAs */}
          {activeTab === 'safety' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-text">Hazard Escalation Clock & SLAs</h2>
              <div className="space-y-3">
                {SEED_HAZARDS.map((h) => (
                  <Card key={h.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-text">{h.title}</span>
                      <Chip status={h.severity === 'URGENT' ? 'URGENT' : 'OPEN'} label={h.severity} />
                    </div>
                    <p className="text-sm text-grey-300">{h.description}</p>
                    <div className="p-2.5 rounded bg-grey-900 border border-grey-800 flex items-center justify-between text-xs">
                      <span>Zone: {h.zone}</span>
                      <span className="font-bold text-warn">Corroborators: {h.corroboratorCount} workers</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: COLLECTIVE VOICE VAULT */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-text">Collective Escrow Alerts (Unlocked Only)</h2>
              <p className="text-xs text-grey-500">
                Note: In accordance with differential privacy rules, locked reports under the K=3 threshold are completely hidden from this admin cockpit.
              </p>
              <div className="space-y-3">
                {unlockedComplaints.map((c) => (
                  <Card key={c.id} className="p-4 space-y-2 border-lime/40 bg-lime/5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lime text-base">{c.targetId}</span>
                      <Chip status={c.isUrgent ? 'URGENT' : 'MATCH'} label="UNLOCKED GROUP ALERT" />
                    </div>
                    <p className="text-sm text-text">{c.sanitizedSummary}</p>
                    <div className="text-[11px] text-grey-500 pt-1 border-t border-grey-800">
                      Anonymized & scrubbed &bull; Threshold of 3+ distinct workers verified
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: CONSENSUS OVERTIME */}
          {activeTab === 'overtime' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-text">Consensus Overtime Anomalies</h2>
              <Card className="p-5 border-warn/40 bg-warn/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warn" />
                    <span className="font-bold text-base text-text">Hostel Block A Sanitation Crew</span>
                  </div>
                  <Chip status="NEEDS_REVIEW" label="3 PEERS CONFIRMED" />
                </div>
                <p className="text-sm text-grey-300">
                  3 distinct workers tapped &quot;Still working&quot; within 20 minutes after the scheduled 16:00 shift end.
                  Contractor muster roll logged 8 hours. Potential unrecorded 1h overtime anomaly.
                </p>
              </Card>
            </div>
          )}

          {/* TAB 7: THEKEDAR SCORECARDS */}
          {activeTab === 'contractors' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-text">Contractor (Thekedar) Accountability</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">Balaji Facility Services</h3>
                    <Chip status="MATCH" label="TIER 1 RATED" />
                  </div>
                  <p className="text-xs text-grey-500">SRMIST Campus Sanitation Contract</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-grey-300">Pay Accuracy</span>
                      <span className="font-bold text-lime">94.2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-grey-300">Hazard Resolution SLA</span>
                      <span className="font-bold text-lime">88.0%</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">Sharma Rail Infra</h3>
                    <Chip status="NEEDS_REVIEW" label="EARLY WARNING" />
                  </div>
                  <p className="text-xs text-grey-500">Metro Line 4 Substructure Contract</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-grey-300">Pay Accuracy</span>
                      <span className="font-bold text-warn">81.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-grey-300">Hazard Resolution SLA</span>
                      <span className="font-bold text-danger">64.0%</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 8: BURNOUT & RISK RADAR */}
          {activeTab === 'people' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-text">Crew Burnout & Quit-Risk Radar</h2>
              <p className="text-xs text-grey-500">
                Aggregates with fewer than 3 people are automatically suppressed to protect privacy.
              </p>
              <div className="space-y-3">
                <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-base text-text block">Hostel Block A Sanitation Shift</span>
                    <p className="text-xs text-grey-500 mt-0.5">Aggregate: 4 workers</p>
                    <p className="text-sm text-warn mt-1">
                      <strong>Why:</strong> Average rest between back-to-back shifts was 8.2 hours (statutory minimum is 10 hours).
                    </p>
                  </div>
                  <div className="text-end shrink-0">
                    <span className="text-xs font-bold text-lime block">Suggested Action:</span>
                    <span className="text-xs text-grey-300">Enforce 10h rest interval before morning roster.</span>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 9: COMPLIANCE INSPECTION-READY PACK */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-text">Inspection-Ready Pack</h2>
                <p className="text-sm text-grey-300">
                  One-tap statutory registers exportable as CSV and printable audit dossiers.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-base text-text">Muster Roll Register</h3>
                    <p className="text-xs text-grey-500 mt-1">Form D attendance, working hours, and Two-Key verification stamps</p>
                  </div>
                  <Button variant="primary" size="md" onClick={() => handleDownloadCsv('muster')}>
                    Download Muster CSV
                  </Button>
                </Card>

                <Card className="p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-base text-text">Overtime Register</h3>
                    <p className="text-xs text-grey-500 mt-1">Form IV overtime hours and statutory 2x rate calculations</p>
                  </div>
                  <Button variant="primary" size="md" onClick={() => handleDownloadCsv('overtime')}>
                    Download Overtime CSV
                  </Button>
                </Card>

                <Card className="p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-base text-text">Wage Disbursement Register</h3>
                    <p className="text-xs text-grey-500 mt-1">Form B wages, deductions, and verified net settlements</p>
                  </div>
                  <Button variant="primary" size="md" onClick={() => handleDownloadCsv('wage')}>
                    Download Wage CSV
                  </Button>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* SAFETY GEAR PHOTO INSPECTION MODAL */}
      <Modal
        isOpen={!!inspectingWorker}
        onClose={() => setInspectingWorker(null)}
        title="Safety Gear (PPE) Inspection & Verification"
      >
        {inspectingWorker && (
          <div className="space-y-5">
            {/* Worker summary header */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-grey-900 border border-grey-800">
              <div>
                <h3 className="font-bold text-base text-text">{inspectingWorker.name}</h3>
                <p className="text-xs text-grey-400">
                  {inspectingWorker.zone} &bull; Sector: {inspectingWorker.sectorId.toUpperCase()}
                </p>
              </div>
              <div className="text-end">
                <span className="text-[10px] text-grey-500 block uppercase font-bold">Shift Duration</span>
                <span className="text-sm font-black text-lime">{inspectingWorker.hoursWorked}h logged</span>
              </div>
            </div>

            {/* High-Res Photo with Geo & Timestamp Watermark */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-grey-700 bg-black aspect-video flex items-center justify-center">
              <img
                src={
                  inspectingWorker.safetyPhotoUrl ||
                  DEFAULT_PPE_SVGS[inspectingWorker.id] ||
                  DEFAULT_PPE_SVGS['worker-sunita']
                }
                alt={`Safety Gear Photo for ${inspectingWorker.name}`}
                className="w-full h-full object-contain"
              />

              {/* Watermark Overlay */}
              <div className="absolute bottom-2 left-2 right-2 p-2 rounded-lg bg-black/80 backdrop-blur-sm border border-grey-700 text-[11px] font-mono flex items-center justify-between text-grey-300">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-lime" />
                  <span>
                    GPS: {inspectingWorker.coords.lat}° N, {inspectingWorker.coords.lon}° E
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-lime" />
                  <span>Captured: {inspectingWorker.safetyPhotoTimestamp || '08:02 AM'}</span>
                </div>
              </div>
            </div>

            {/* PPE Detection Checklist */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-grey-400">
                Mandatory PPE Audit Checklist:
              </h4>
              <div className="space-y-1.5">
                {inspectingWorker.ppeItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-grey-900 border border-grey-800 text-xs"
                  >
                    <span className="font-medium text-text">{item.name}</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        item.verified ? 'bg-lime/20 text-lime' : 'bg-danger/20 text-danger'
                      }`}
                    >
                      {item.verified ? 'DETECTED & VERIFIED' : 'MISSING / UNCONFIRMED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Health Vitals Summary */}
            <div className="grid grid-cols-4 gap-2 p-2.5 rounded-xl bg-grey-900 border border-grey-800 text-center">
              <div>
                <span className="text-[10px] text-grey-500 uppercase block">Blood</span>
                <span className="text-xs font-bold text-lime">{inspectingWorker.bloodGroup}</span>
              </div>
              <div>
                <span className="text-[10px] text-grey-500 uppercase block">Age</span>
                <span className="text-xs font-bold text-text">{inspectingWorker.age}y</span>
              </div>
              <div>
                <span className="text-[10px] text-grey-500 uppercase block">Body Weight</span>
                <span className="text-xs font-bold text-text">{inspectingWorker.weight}</span>
              </div>
              <div>
                <span className="text-[10px] text-grey-500 uppercase block">Height</span>
                <span className="text-xs font-bold text-text">{inspectingWorker.height}</span>
              </div>
            </div>

            {/* Inspection Decision Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                onClick={() => handleApprovePpe(inspectingWorker.id)}
              >
                <Check className="w-4 h-4 mr-1.5" />
                Approve PPE & Clear Shift
              </Button>

              <Button
                variant="danger"
                size="md"
                className="flex-1"
                onClick={() => handleFlagPpe(inspectingWorker.id)}
              >
                <X className="w-4 h-4 mr-1.5" />
                Flag Non-Compliance
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
