'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import {
  CheckCircle,
  Clock,
  ThermometerSun,
  ShieldCheck,
  Award,
  AlertTriangle,
  QrCode,
  MapPin,
  Camera,
  Upload,
  HeartPulse,
  Navigation,
  ShieldAlert,
} from 'lucide-react';

export default function WorkerHomePage() {
  const { t } = useI18n();
  const { showToast } = useToast();

  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [shiftHoursElapsed, setShiftHoursElapsed] = useState(7.5);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isStillWorkingActive, setIsStillWorkingActive] = useState(false);
  const [zone, setZone] = useState('Hostel Block A & B (Sanitation)');

  // Worker Health Vitals (synced with localStorage)
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [age, setAge] = useState('32');
  const [weight, setWeight] = useState('58');
  const [height, setHeight] = useState('162');

  // Mandatory Safety Gear Photo & Geo-tag state
  const [safetyGearPhoto, setSafetyGearPhoto] = useState<string>('');
  const [safetyPhotoTimestamp, setSafetyPhotoTimestamp] = useState<string>('');
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({ lat: 12.8234, lon: 80.0451 });
  const [locationError, setLocationError] = useState<string>('');
  const [safetyPhotoMissingWarning, setSafetyPhotoMissingWarning] = useState(false);

  useEffect(() => {
    const savedBlood = localStorage.getItem('fairshift_worker_blood');
    if (savedBlood) setBloodGroup(savedBlood);

    const savedAge = localStorage.getItem('fairshift_worker_age');
    if (savedAge) setAge(savedAge);

    const savedWeight = localStorage.getItem('fairshift_worker_weight');
    if (savedWeight) setWeight(savedWeight);

    const savedHeight = localStorage.getItem('fairshift_worker_height');
    if (savedHeight) setHeight(savedHeight);

    // Fetch browser location if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: Number(pos.coords.latitude.toFixed(4)),
            lon: Number(pos.coords.longitude.toFixed(4)),
          });
        },
        () => {
          // Default site coords
          setCoords({ lat: 12.8234, lon: 80.0451 });
        }
      );
    }
  }, []);

  const handleSafetyPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSafetyGearPhoto(dataUrl);
      setSafetyPhotoTimestamp(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      setSafetyPhotoMissingWarning(false);
      showToast('Safety gear photo captured & geo-stamped!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmCheckIn = () => {
    if (!safetyGearPhoto) {
      setSafetyPhotoMissingWarning(true);
      showToast('Mandatory: Please click or upload your safety gear photo before check-in!', 'error');
      return;
    }

    setIsCheckedIn(true);
    setIsCheckInModalOpen(false);

    try {
      localStorage.setItem(
        'fairshift_latest_checkin_ppe',
        JSON.stringify({
          workerName: 'Sunita Devi',
          workerId: 'worker-sunita',
          photo: safetyGearPhoto,
          timestamp: safetyPhotoTimestamp || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          coords,
          status: 'VERIFIED',
          gearChecked: ['Hard Hat / Cap', 'High-Vis Vest / Apron', 'Safety Gloves / Boots'],
        })
      );
    } catch {
      // Ignore localStorage quotas in demo
    }

    showToast('Checked in successfully! Geo-tag & Safety PPE verified on ledger.', 'success');
  };

  const handleStillWorkingTap = () => {
    setIsStillWorkingActive(true);
    showToast('Logged: "Still working" consensus ping submitted.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Worker Greeting */}
      <div className="text-start space-y-1">
        <h1 className="text-2xl font-extrabold text-text">
          {t('worker.greeting')}, Sunita ji!
        </h1>
        <p className="text-sm text-grey-300">
          Worksite: <span className="font-semibold text-lime">{zone}</span>
        </p>
      </div>

      {/* Worker Health Vitals Summary Bar */}
      <section className="p-3.5 rounded-2xl bg-grey-900 border border-grey-700/80 shadow-md">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-grey-800">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-danger animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-grey-400">
              Worker Medical Bio & Vitals
            </span>
          </div>
          <span className="text-[11px] text-lime font-bold">Medical Clearance Active</span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-xl bg-grey-800/80 border border-grey-700">
            <span className="text-[10px] text-grey-400 uppercase block font-semibold">Blood</span>
            <span className="text-sm font-black text-danger">🩸 {bloodGroup}</span>
          </div>
          <div className="p-2 rounded-xl bg-grey-800/80 border border-grey-700">
            <span className="text-[10px] text-grey-400 uppercase block font-semibold">Age</span>
            <span className="text-sm font-black text-text">{age} yrs</span>
          </div>
          <div className="p-2 rounded-xl bg-grey-800/80 border border-grey-700">
            <span className="text-[10px] text-grey-400 uppercase block font-semibold">Weight</span>
            <span className="text-sm font-black text-text">{weight} kg</span>
          </div>
          <div className="p-2 rounded-xl bg-grey-800/80 border border-grey-700">
            <span className="text-[10px] text-grey-400 uppercase block font-semibold">Height</span>
            <span className="text-sm font-black text-text">{height} cm</span>
          </div>
        </div>
      </section>

      {/* Main Check-In / Status Action */}
      {!isCheckedIn ? (
        <div className="space-y-2">
          {/* Huge Lime 72px Check In Button */}
          <Button
            variant="huge"
            onClick={() => setIsCheckInModalOpen(true)}
            className="flex items-center justify-center gap-3 text-2xl font-extrabold shadow-2xl"
          >
            <CheckCircle className="w-8 h-8" />
            <span>{t('worker.check_in_button')}</span>
          </Button>
          <p className="text-xs text-center text-grey-500">
            Mandatory safety gear verification &bull; Geo-presence proof stamp
          </p>
        </div>
      ) : (
        <Card className="border-2 border-lime/40 bg-lime/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-lime animate-ping" />
              <span className="font-bold text-lime text-base">{t('worker.checked_in_status')}</span>
            </div>
            <Chip status="MATCH" label="ACTIVE SHIFT" />
          </div>

          <div className="flex items-center justify-between py-2 border-y border-grey-700/50">
            <div>
              <span className="text-xs text-grey-500 uppercase block">Check-in time</span>
              <span className="text-lg font-bold">07:00 AM</span>
            </div>
            <div className="text-end">
              <span className="text-xs text-grey-500 uppercase block">Elapsed</span>
              <span className="text-lg font-bold text-lime">{shiftHoursElapsed}h logged</span>
            </div>
          </div>

          {/* Geo-tag & Safety Gear Proof Badge */}
          <div className="p-3 rounded-xl bg-grey-900 border border-grey-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-black shrink-0 border border-lime">
                {safetyGearPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={safetyGearPhoto} alt="Safety Gear" className="w-full h-full object-cover" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-lime m-2" />
                )}
              </div>
              <div className="text-start">
                <span className="font-bold text-lime block">Safety Gear Verified</span>
                <span className="text-grey-400 text-[11px]">
                  📍 {coords.lat}&deg; N, {coords.lon}&deg; E &bull; On-Site
                </span>
              </div>
            </div>
            <Chip status="MATCH" label="GEO-TAGGED" />
          </div>

          {/* End-of-shift window: "I am still working" button */}
          <div className="pt-1">
            <Button
              variant={isStillWorkingActive ? 'secondary' : 'primary'}
              onClick={handleStillWorkingTap}
              className="w-full text-lg"
            >
              {isStillWorkingActive
                ? 'Still working logged (Consensus active)'
                : t('worker.still_working_button')}
            </Button>
            <p className="text-xs text-center text-grey-500 mt-2">
              If 3+ coworkers in your zone tap this, unlogged overtime is flagged automatically.
            </p>
          </div>
        </Card>
      )}

      {/* Readiness Check Card */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-lime" />
            <span>{t('worker.readiness_title')}</span>
          </h2>
          <Chip status="MATCH" label="FIT FOR WORK" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Rest Hours Indicator */}
          <div className="p-3.5 rounded-xl bg-grey-900 border border-grey-700 space-y-1">
            <div className="flex items-center gap-1.5 text-grey-300 text-xs font-semibold">
              <Clock className="w-4 h-4 text-lime" />
              <span>{t('worker.rest_hours_label')}</span>
            </div>
            <p className="text-2xl font-extrabold text-lime">14.5h</p>
            <p className="text-[11px] text-grey-500">Exceeds 10h statutory rest</p>
          </div>

          {/* Heat Stress Level */}
          <div className="p-3.5 rounded-xl bg-grey-900 border border-grey-700 space-y-1">
            <div className="flex items-center gap-1.5 text-grey-300 text-xs font-semibold">
              <ThermometerSun className="w-4 h-4 text-warn" />
              <span>{t('worker.heat_stress_label')}</span>
            </div>
            <p className="text-2xl font-extrabold text-warn">31°C</p>
            <p className="text-[11px] text-grey-500">10m shade rest / hour</p>
          </div>
        </div>
      </Card>

      {/* Skill Passport Progress Card */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-lime" />
            <h2 className="text-lg font-bold text-text">{t('worker.skill_passport_title')}</h2>
          </div>
          <span className="text-xs font-bold text-lime">LEVEL 2 OPERATOR</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-grey-300">
            <span>{t('worker.safe_hours_progress')}</span>
            <span className="font-bold text-text">188 / 200 hours</span>
          </div>
          <div className="w-full h-3 bg-grey-900 rounded-full overflow-hidden border border-grey-700">
            <div
              className="h-full bg-lime rounded-full transition-all duration-500"
              style={{ width: '94%' }}
            />
          </div>
          <p className="text-xs text-grey-500 pt-0.5">
            12 safe hours to Senior Operator certification badge
          </p>
        </div>
      </Card>

      {/* Check In Modal with Mandatory Safety Gear Photo & Geo-Location Map */}
      <Modal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        title="Shift Check-In & Safety Verification"
      >
        <div className="space-y-4">
          {/* Worksite & Geofence Verification Card */}
          <div className="p-4 rounded-xl bg-grey-900 border border-grey-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lime font-bold text-sm">
                <MapPin className="w-4 h-4" />
                <span>Assigned Worksite Zone</span>
              </div>
              <Chip status="MATCH" label="ON-SITE" />
            </div>

            <div>
              <p className="text-base font-extrabold text-text">{zone}</p>
              <p className="text-xs text-grey-400">SRMIST Campus Kattankulathur Main Facility</p>
            </div>

            {/* Visual Worksite Map Representation */}
            <div className="relative w-full h-32 rounded-xl bg-obsidian border border-grey-700 overflow-hidden flex items-center justify-center p-3">
              {/* Map background grid pattern */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle, #A3E635 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              />

              {/* Worksite Safe Perimeter Circle */}
              <div className="relative w-24 h-24 rounded-full border-2 border-lime/50 bg-lime/10 flex items-center justify-center animate-pulse">
                {/* Site Center Marker */}
                <div className="w-4 h-4 rounded-full bg-lime border-2 border-black flex items-center justify-center shadow-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-black" />
                </div>
                {/* Distance text */}
                <span className="absolute -bottom-5 text-[10px] font-bold text-lime whitespace-nowrap bg-black/80 px-1.5 py-0.5 rounded">
                  Within 15m radius
                </span>
              </div>

              {/* GPS Stamp */}
              <div className="absolute top-2 start-2 bg-black/80 px-2 py-1 rounded text-[10px] font-mono text-grey-300">
                GPS: {coords.lat}&deg; N, {coords.lon}&deg; E
              </div>

              <div className="absolute top-2 end-2 bg-lime/20 border border-lime text-lime px-2 py-0.5 rounded text-[10px] font-bold">
                ✓ Geofence Verified
              </div>
            </div>
          </div>

          {/* Mandatory Safety Gear Photo Capture */}
          <div className="p-4 rounded-xl bg-grey-900 border-2 border-lime/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-lime" />
                <span className="text-sm font-extrabold text-text">
                  Safety Gear Photo (Mandatory)
                </span>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-danger/20 text-danger border border-danger/40">
                REQUIRED
              </span>
            </div>

            <p className="text-xs text-grey-300">
              Snap a live photo wearing your <strong>Helmet, High-Vis Vest, and Safety Gloves</strong> to verify compliance on the ledger.
            </p>

            {/* Photo Preview / Upload Controls */}
            {safetyGearPhoto ? (
              <div className="relative rounded-xl overflow-hidden border-2 border-lime w-full h-44 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={safetyGearPhoto}
                  alt="Captured Safety Gear"
                  className="w-full h-full object-cover"
                />
                {/* Watermark overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-black/75 p-2 text-start font-mono text-[10px] text-lime flex items-center justify-between">
                  <span>📍 GPS: {coords.lat} N, {coords.lon} E</span>
                  <span>⏰ {safetyPhotoTimestamp}</span>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl border-2 border-dashed border-grey-700 bg-obsidian text-center space-y-2">
                <ShieldAlert className="w-10 h-10 text-warn mx-auto" />
                <p className="text-xs font-bold text-grey-300">No safety gear photo captured yet</p>
                <p className="text-[11px] text-grey-500">Statutory safety rule: Gear photo required to check in</p>
              </div>
            )}

            {/* Photo Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="cursor-pointer py-2.5 px-3 rounded-xl bg-lime text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all">
                <Camera className="w-4 h-4" />
                <span>Click Camera Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleSafetyPhotoUpload}
                  className="hidden"
                />
              </label>

              <label className="cursor-pointer py-2.5 px-3 rounded-xl bg-grey-800 border border-grey-600 text-text font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-grey-700 active:scale-95 transition-all">
                <Upload className="w-4 h-4 text-lime" />
                <span>Upload from Gallery</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSafetyPhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {safetyPhotoMissingWarning && !safetyGearPhoto && (
              <p className="text-xs font-bold text-danger pt-1 animate-bounce">
                ⚠️ You must click or upload a safety gear photo before continuing!
              </p>
            )}
          </div>

          <Button
            variant="huge"
            onClick={handleConfirmCheckIn}
            className="w-full text-xl font-extrabold shadow-2xl"
          >
            Confirm shift check-in
          </Button>

          <Button variant="ghost" onClick={() => setIsCheckInModalOpen(false)} className="w-full">
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
