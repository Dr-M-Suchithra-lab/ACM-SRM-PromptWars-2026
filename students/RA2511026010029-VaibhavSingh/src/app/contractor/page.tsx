'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { SEED_CORRECTIONS } from '@/lib/storage/seedData';
import {
  Users,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  ArrowLeft,
  DollarSign,
  AlertTriangle,
  Building2,
  UserPlus,
  MapPin,
  Briefcase,
  Plus,
} from 'lucide-react';

interface Worksite {
  id: string;
  name: string;
  sector: string;
  address: string;
  requiredSkills: string[];
}

interface LabourMember {
  id: string;
  name: string;
  phone: string;
  skillset: string;
  bloodGroup: string;
  hourlyRate: number;
  assignedSite: string;
  safeHoursLogged: number;
  avatar: string;
}

export default function ContractorPortalPage() {
  const { t } = useI18n();
  const { showToast } = useToast();

  const [corrections, setCorrections] = useState([...SEED_CORRECTIONS]);
  const [selectedCorrection, setSelectedCorrection] = useState<any>(null);
  const [contractorResponseNote, setContractorResponseNote] = useState('');

  // Modals state
  const [isPayEntryModalOpen, setIsPayEntryModalOpen] = useState(false);
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
  const [isAddLabourModalOpen, setIsAddLabourModalOpen] = useState(false);

  // Pay entry state
  const [payEntryWorker, setPayEntryWorker] = useState('worker-sunita');
  const [payEntryHours, setPayEntryHours] = useState('9');
  const [payEntryAmount, setPayEntryAmount] = useState('1080');

  // Worksite list state
  const [sites, setSites] = useState<Worksite[]>([
    {
      id: 'site-1',
      name: 'Hostel Block A & B (Sanitation)',
      sector: 'Campus Facilities',
      address: 'SRMIST Kattankulathur Main Campus',
      requiredSkills: ['Sanitation', 'Floor Maintenance', 'Waste Segregation'],
    },
    {
      id: 'site-2',
      name: 'Tech Park Towers Floor 3-6',
      sector: 'Facility Maintenance',
      address: 'Tech Park Complex, Chennai',
      requiredSkills: ['Janitorial', 'Electrical Basics'],
    },
    {
      id: 'site-3',
      name: 'Metro Rail Corridor Pier 40-55',
      sector: 'Civil Construction',
      address: 'Chennai Metro Line 4 Corridor',
      requiredSkills: ['Heavy Welder', 'Rebar Tier', 'Rigging Safety'],
    },
    {
      id: 'site-4',
      name: 'District General Hospital Sanitation',
      sector: 'Healthcare Support',
      address: 'Main Ward Complex & Biomedical Wing',
      requiredSkills: ['Biomedical Safety', 'Pathology Waste', 'Disinfection'],
    },
  ]);

  // Labour crew state
  const [crew, setCrew] = useState<LabourMember[]>([
    {
      id: 'worker-sunita',
      name: 'Sunita Devi',
      phone: '+91 99999 99999',
      skillset: 'Sanitation Lead & Disinfection',
      bloodGroup: 'O+',
      hourlyRate: 120,
      assignedSite: 'Hostel Block A & B (Sanitation)',
      safeHoursLogged: 188,
      avatar: '👩🏽',
    },
    {
      id: 'worker-rajesh',
      name: 'Rajesh Kumar',
      phone: '+91 99999 99998',
      skillset: 'Certified High-Pressure Welder',
      bloodGroup: 'B+',
      hourlyRate: 145,
      assignedSite: 'Metro Rail Corridor Pier 40-55',
      safeHoursLogged: 164,
      avatar: '👨🏽',
    },
    {
      id: 'worker-priya',
      name: 'Priya Sharma',
      phone: '+91 99999 99997',
      skillset: 'Biomedical Hazardous Waste Handler',
      bloodGroup: 'A+',
      hourlyRate: 135,
      assignedSite: 'District General Hospital Sanitation',
      safeHoursLogged: 195,
      avatar: '👩🏽',
    },
    {
      id: 'worker-amit',
      name: 'Amit Verma',
      phone: '+91 99999 99996',
      skillset: 'Rebar Tier & Scaffold Rigging',
      bloodGroup: 'AB+',
      hourlyRate: 130,
      assignedSite: 'Metro Rail Corridor Pier 40-55',
      safeHoursLogged: 142,
      avatar: '👨🏽',
    },
    {
      id: 'worker-meena',
      name: 'Meena Bai',
      phone: '+91 99999 99995',
      skillset: 'Janitorial & Floor Polisher',
      bloodGroup: 'O-',
      hourlyRate: 115,
      assignedSite: 'Tech Park Towers Floor 3-6',
      safeHoursLogged: 176,
      avatar: '👩🏽',
    },
  ]);

  // Form states for adding site
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteSector, setNewSiteSector] = useState('Campus Facilities');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [newSiteSkills, setNewSiteSkills] = useState('Welding, Rigging, Safety');

  // Form states for adding labour
  const [newLabourName, setNewLabourName] = useState('');
  const [newLabourPhone, setNewLabourPhone] = useState('999999999');
  const [newLabourSkill, setNewLabourSkill] = useState('Construction Mason & Finisher');
  const [newLabourBlood, setNewLabourBlood] = useState('O+');
  const [newLabourRate, setNewLabourRate] = useState('130');
  const [newLabourSite, setNewLabourSite] = useState(sites[0]?.name || '');

  const handleAssignSite = (workerId: string, siteName: string) => {
    setCrew((prev) =>
      prev.map((w) => (w.id === workerId ? { ...w, assignedSite: siteName } : w))
    );
    showToast(`Assigned ${crew.find((w) => w.id === workerId)?.name} to ${siteName}`, 'success');
  };

  const handleAddWorksite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim()) {
      showToast('Please enter a worksite name', 'error');
      return;
    }
    const newSite: Worksite = {
      id: `site-${Date.now().toString().slice(-4)}`,
      name: newSiteName.trim(),
      sector: newSiteSector,
      address: newSiteAddress.trim() || 'Worksite Compound',
      requiredSkills: newSiteSkills.split(',').map((s) => s.trim()).filter(Boolean),
    };
    setSites((prev) => [...prev, newSite]);
    setIsAddSiteModalOpen(false);
    setNewSiteName('');
    setNewSiteAddress('');
    showToast(`Added worksite: "${newSite.name}"`, 'success');
  };

  const handleAddLabour = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabourName.trim()) {
      showToast('Please enter labour full name', 'error');
      return;
    }
    const newWorker: LabourMember = {
      id: `worker-${Date.now().toString().slice(-4)}`,
      name: newLabourName.trim(),
      phone: newLabourPhone.trim() || '+91 99999 99999',
      skillset: newLabourSkill.trim() || 'General Labour & Helper',
      bloodGroup: newLabourBlood,
      hourlyRate: Number(newLabourRate) || 120,
      assignedSite: newLabourSite || sites[0]?.name || 'Unassigned',
      safeHoursLogged: 0,
      avatar: '👷',
    };
    setCrew((prev) => [...prev, newWorker]);
    setIsAddLabourModalOpen(false);
    setNewLabourName('');
    showToast(`Registered & assigned ${newWorker.name} to ${newWorker.assignedSite}!`, 'success');
  };

  const handleResolveCorrection = (id: string, action: 'APPROVED' | 'REJECTED') => {
    setCorrections((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: action,
              contractorComment: contractorResponseNote || (action === 'APPROVED' ? 'Approved by agency' : 'Hours not corroborated'),
            }
          : c
      )
    );
    setSelectedCorrection(null);
    setContractorResponseNote('');
    showToast(
      action === 'APPROVED'
        ? 'Correction approved! Worker receipt reconciled to MATCH.'
        : 'Correction rejected with supervisor remark.',
      action === 'APPROVED' ? 'success' : 'info'
    );
  };

  const handleCreatePayEntry = () => {
    showToast(`Wage disbursement of ₹${payEntryAmount} logged for ${payEntryHours} hours. Paid record created!`, 'success');
    setIsPayEntryModalOpen(false);
  };

  return (
    <main id="main-content" className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-grey-700">
        <div className="flex items-center gap-3.5">
          <img
            src="/images/hisaab-logo.jpg"
            alt="Hisaab Logo"
            className="w-12 h-12 rounded-xl object-contain bg-white p-0.5 border border-lime/50 shadow shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-grey-500 hover:text-lime">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to home</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text">{t('contractor.title')}</h1>
            <p className="text-xs text-grey-300">
              Balaji Facility & Allied Contractors &bull; MongoDB Synced (vaibhavnr06@gmail.com)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsAddSiteModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <Building2 className="w-4 h-4 text-lime" />
            <span>+ Add Worksite</span>
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsAddLabourModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <UserPlus className="w-4 h-4 text-lime" />
            <span>+ Register Labour</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsPayEntryModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <DollarSign className="w-4 h-4" />
            <span>{t('contractor.enter_pay')}</span>
          </Button>
        </div>
      </header>

      {/* Scorecard Overview */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-grey-500">
          {t('contractor.scorecard')} (Verified by Principal Employer)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="text-center p-4">
            <span className="text-xs text-grey-500 uppercase block">Pay Accuracy</span>
            <span className="text-2xl font-black text-lime mt-1 block">94.2%</span>
            <span className="text-[11px] text-grey-500">2 open corrections</span>
          </Card>
          <Card className="text-center p-4">
            <span className="text-xs text-grey-500 uppercase block">Active Sites</span>
            <span className="text-2xl font-black text-text mt-1 block">{sites.length}</span>
            <span className="text-[11px] text-grey-500">{crew.length} assigned personnel</span>
          </Card>
          <Card className="text-center p-4">
            <span className="text-xs text-grey-500 uppercase block">Hazard Closure</span>
            <span className="text-2xl font-black text-warn mt-1 block">88%</span>
            <span className="text-[11px] text-grey-500">1 awaiting After photo</span>
          </Card>
          <Card className="text-center p-4">
            <span className="text-xs text-grey-500 uppercase block">Crew Trust Score</span>
            <span className="text-2xl font-black text-lime mt-1 block">4.8 / 5</span>
            <span className="text-[11px] text-grey-500">Zero walkouts</span>
          </Card>
        </div>
      </section>

      {/* SECTION 1: Worksites & Required Skillsets */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-grey-500">
              Active Worksites & Skillset Requirements
            </h2>
            <p className="text-xs text-grey-400">Manage deployment zones and required labour capabilities</p>
          </div>
          <Button
            variant="ghost"
            size="md"
            onClick={() => setIsAddSiteModalOpen(true)}
            className="text-xs text-lime font-bold min-h-0 h-9 px-3"
          >
            + New Site
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sites.map((site) => {
            const assignedCount = crew.filter((w) => w.assignedSite === site.name).length;
            return (
              <Card key={site.id} className="p-4 space-y-2.5 border-grey-700">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-lime shrink-0" />
                    <div>
                      <h3 className="text-base font-bold text-text">{site.name}</h3>
                      <span className="text-xs text-grey-400">{site.sector}</span>
                    </div>
                  </div>
                  <Chip
                    status="MATCH"
                    label={`${assignedCount} LABOUR`}
                  />
                </div>

                <div className="text-xs text-grey-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-grey-500 shrink-0" />
                  <span className="truncate">{site.address}</span>
                </div>

                <div className="pt-1">
                  <span className="text-[10px] font-bold uppercase text-grey-500 block mb-1">
                    Required Skillsets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {site.requiredSkills.map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-grey-900 border border-grey-800 text-[11px] text-lime font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: Labour Crew, Skillsets & Dynamic Site Assignment */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-grey-500">
              {t('contractor.crew')} ({crew.length} Registered Labour Personnel)
            </h2>
            <p className="text-xs text-grey-400">View skillsets, blood groups, and assign to worksites</p>
          </div>
          <Button
            variant="ghost"
            size="md"
            onClick={() => setIsAddLabourModalOpen(true)}
            className="text-xs text-lime font-bold min-h-0 h-9 px-3"
          >
            + Add Labour
          </Button>
        </div>

        <div className="space-y-3">
          {crew.map((worker) => (
            <Card key={worker.id} className="p-4 space-y-3 border-grey-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-grey-900 border border-grey-700 flex items-center justify-center text-2xl shadow">
                    {worker.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-text">{worker.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-danger/20 border border-danger/40 text-danger text-[10px] font-black">
                        🩸 {worker.bloodGroup}
                      </span>
                      <span className="text-xs text-lime font-bold">₹{worker.hourlyRate}/h</span>
                    </div>
                    <span className="text-xs text-grey-300 font-medium block mt-0.5">
                      Skillset: <strong className="text-text">{worker.skillset}</strong>
                    </span>
                    <span className="text-[11px] text-grey-500">Phone: {worker.phone} &bull; {worker.safeHoursLogged} safe hours</span>
                  </div>
                </div>

                {/* Site Assignment Dropdown */}
                <div className="flex flex-col sm:items-end gap-1">
                  <label className="text-[10px] font-bold uppercase text-grey-400">
                    Assigned Worksite Place:
                  </label>
                  <select
                    value={worker.assignedSite}
                    onChange={(e) => handleAssignSite(worker.id, e.target.value)}
                    className="bg-grey-900 border border-grey-700 text-lime font-bold text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-lime cursor-pointer max-w-xs"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.name}>
                        📍 {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* SECTION 3: Corrections Inbox */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-grey-500">
            Corrections Inbox (Worker Wage Review Requests)
          </h2>
          <span className="text-xs font-bold text-warn">
            {corrections.filter((c) => c.status === 'PENDING').length} Action(s) Required
          </span>
        </div>

        <div className="space-y-3">
          {corrections.map((corr) => (
            <Card key={corr.id} className="space-y-3 border-grey-700">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-base font-bold text-text">{corr.workerName}</span>
                  <span className="text-xs text-grey-500 block">Shift Date: {corr.shiftDate}</span>
                </div>
                <Chip
                  status={corr.status === 'PENDING' ? 'NEEDS_REVIEW' : 'MATCH'}
                  label={corr.status}
                />
              </div>

              <div className="p-3 rounded-xl bg-grey-900 border border-grey-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-grey-500">Claimed: {corr.claimedHours}h vs Paid: {corr.paidHours}h</span>
                  <span className="font-extrabold text-danger">Unpaid Difference: ₹{corr.claimedDifferenceRupees}</span>
                </div>
                <p className="text-grey-300 italic pt-1">Worker note: &quot;{corr.workerNote}&quot;</p>
              </div>

              {corr.status === 'PENDING' ? (
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setSelectedCorrection(corr)}
                    className="text-xs text-grey-300"
                  >
                    Respond & Remark
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleResolveCorrection(corr.id, 'APPROVED')}
                    className="text-xs"
                  >
                    Approve & Disburse ₹{corr.claimedDifferenceRupees}
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-lime font-bold">
                  Status: {corr.status} &bull; Comment: {corr.contractorComment || 'Settled'}
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* MODAL 1: Add Worksite */}
      <Modal
        isOpen={isAddSiteModalOpen}
        onClose={() => setIsAddSiteModalOpen(false)}
        title="Add New Worksite"
      >
        <form onSubmit={handleAddWorksite} className="space-y-4">
          <Field
            id="new-site-name"
            label="Worksite Name"
            placeholder="e.g. Metro Line 4 Pillar 120-140"
            value={newSiteName}
            onChange={(e) => setNewSiteName(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-grey-300">Sector / Category</label>
            <select
              value={newSiteSector}
              onChange={(e) => setNewSiteSector(e.target.value)}
              className="w-full min-h-[48px] px-3 rounded-xl bg-grey-900 border border-grey-700 text-text text-sm focus:ring-2 focus:ring-lime"
            >
              <option value="Campus Facilities">Campus Facilities & Hostels</option>
              <option value="Civil Construction">Civil & Metro Construction</option>
              <option value="Healthcare Support">Hospital & Medical Support</option>
              <option value="Industrial Factory">Industrial & Warehouse</option>
            </select>
          </div>

          <Field
            id="new-site-address"
            label="Site Physical Location / Address"
            placeholder="e.g. Kattankulathur Chennai Outer Ring"
            value={newSiteAddress}
            onChange={(e) => setNewSiteAddress(e.target.value)}
          />

          <Field
            id="new-site-skills"
            label="Required Labour Skillsets (comma separated)"
            placeholder="e.g. Masonry, Rigging, Welding"
            value={newSiteSkills}
            onChange={(e) => setNewSiteSkills(e.target.value)}
          />

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsAddSiteModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="flex-1">
              Add Worksite
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Register Labour / Worker */}
      <Modal
        isOpen={isAddLabourModalOpen}
        onClose={() => setIsAddLabourModalOpen(false)}
        title="Register Labour & Assign Worksite"
      >
        <form onSubmit={handleAddLabour} className="space-y-4">
          <Field
            id="new-labour-name"
            label="Labour Full Name"
            placeholder="e.g. Ramesh Kumar"
            value={newLabourName}
            onChange={(e) => setNewLabourName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="new-labour-phone"
              label="Phone Number"
              placeholder="999999999"
              value={newLabourPhone}
              onChange={(e) => setNewLabourPhone(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-grey-300">Blood Group</label>
              <select
                value={newLabourBlood}
                onChange={(e) => setNewLabourBlood(e.target.value)}
                className="w-full min-h-[48px] px-3 rounded-xl bg-grey-900 border border-grey-700 text-text text-sm focus:ring-2 focus:ring-lime"
              >
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Field
            id="new-labour-skill"
            label="Labour Skillset / Specialization"
            placeholder="e.g. Heavy Arc Welder / Sanitation Specialist"
            value={newLabourSkill}
            onChange={(e) => setNewLabourSkill(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="new-labour-rate"
              label="Hourly Rate (₹/h)"
              type="number"
              placeholder="130"
              value={newLabourRate}
              onChange={(e) => setNewLabourRate(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-grey-300">Assign Worksite Place</label>
              <select
                value={newLabourSite}
                onChange={(e) => setNewLabourSite(e.target.value)}
                className="w-full min-h-[48px] px-3 rounded-xl bg-grey-900 border border-grey-700 text-text text-sm focus:ring-2 focus:ring-lime"
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsAddLabourModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="flex-1">
              Register Labour
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Log Wage Disbursement */}
      <Modal
        isOpen={isPayEntryModalOpen}
        onClose={() => setIsPayEntryModalOpen(false)}
        title={t('contractor.enter_pay')}
      >
        <div className="space-y-4">
          <p className="text-sm text-grey-300">
            Log wage settlement. This creates the official tamper-evident &quot;Paid&quot; record on the shift ledger.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-grey-300">Select Worker</label>
            <select
              value={payEntryWorker}
              onChange={(e) => setPayEntryWorker(e.target.value)}
              className="w-full min-h-[48px] px-3 rounded-xl bg-grey-900 border border-grey-700 text-text text-sm focus:ring-2 focus:ring-lime"
            >
              {crew.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (₹{c.hourlyRate}/h) &bull; {c.assignedSite}
                </option>
              ))}
            </select>
          </div>

          <Field
            id="pay-entry-hours"
            label="Hours to Pay"
            type="number"
            value={payEntryHours}
            onChange={(e) => {
              setPayEntryHours(e.target.value);
              setPayEntryAmount(String(Number(e.target.value) * 120));
            }}
          />

          <Field
            id="pay-entry-amount"
            label="Disbursed Rupee Amount (₹)"
            type="number"
            value={payEntryAmount}
            onChange={(e) => setPayEntryAmount(e.target.value)}
          />

          <Button variant="primary" className="w-full" onClick={handleCreatePayEntry}>
            Commit disbursement record
          </Button>
        </div>
      </Modal>

      {/* MODAL 4: Respond to Correction */}
      <Modal
        isOpen={!!selectedCorrection}
        onClose={() => setSelectedCorrection(null)}
        title="Respond to Worker Correction"
      >
        {selectedCorrection && (
          <div className="space-y-4">
            <p className="text-sm text-grey-300">
              Provide a supervisor reason before resolving this correction.
            </p>
            <textarea
              rows={3}
              value={contractorResponseNote}
              onChange={(e) => setContractorResponseNote(e.target.value)}
              placeholder="e.g., Verified with CCTV gate pass; approved 1 hour overtime..."
              className="w-full p-3 rounded-xl bg-grey-900 border border-grey-700 text-text text-sm focus:ring-2 focus:ring-lime"
            />
            <div className="flex gap-2">
              <Button
                variant="danger"
                className="flex-1 text-xs"
                onClick={() => handleResolveCorrection(selectedCorrection.id, 'REJECTED')}
              >
                Reject claim
              </Button>
              <Button
                variant="primary"
                className="flex-1 text-xs"
                onClick={() => handleResolveCorrection(selectedCorrection.id, 'APPROVED')}
              >
                Approve claim
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
