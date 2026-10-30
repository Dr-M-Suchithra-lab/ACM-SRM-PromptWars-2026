'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { useTheme } from '@/lib/theme/context';
import { Modal } from '@/components/ui/Modal';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { ReadAloudButton } from '@/components/ui/ReadAloudButton';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import {
  Home,
  IndianRupee,
  ShieldAlert,
  Megaphone,
  BookOpen,
  Settings,
  LogOut,
  MapPin,
  WifiOff,
  Camera,
  Upload,
  User,
  HeartPulse,
} from 'lucide-react';

export default function WorkerAppLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { skyEffects, setSkyEffects } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [useLocationEnabled, setUseLocationEnabled] = useState(false);

  // Worker Profile & Vitals State (Synced with localStorage)
  const [workerAvatar, setWorkerAvatar] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [age, setAge] = useState('32');
  const [weight, setWeight] = useState('58');
  const [height, setHeight] = useState('162');
  const [workerPhone, setWorkerPhone] = useState('+91 99999 99999');

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const savedAvatar = localStorage.getItem('fairshift_worker_avatar');
    if (savedAvatar) setWorkerAvatar(savedAvatar);

    const savedBlood = localStorage.getItem('fairshift_worker_blood');
    if (savedBlood) setBloodGroup(savedBlood);

    const savedAge = localStorage.getItem('fairshift_worker_age');
    if (savedAge) setAge(savedAge);

    const savedWeight = localStorage.getItem('fairshift_worker_weight');
    if (savedWeight) setWeight(savedWeight);

    const savedHeight = localStorage.getItem('fairshift_worker_height');
    if (savedHeight) setHeight(savedHeight);

    const savedPhone = localStorage.getItem('fairshift_worker_phone');
    if (savedPhone) setWorkerPhone(savedPhone);

    const savedLoc = localStorage.getItem('fairshift_custom_location');
    if (savedLoc) setUseLocationEnabled(true);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setWorkerAvatar(dataUrl);
      localStorage.setItem('fairshift_worker_avatar', dataUrl);
      showToast('Profile picture updated successfully!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('fairshift_worker_blood', bloodGroup);
    localStorage.setItem('fairshift_worker_age', age);
    localStorage.setItem('fairshift_worker_weight', weight);
    localStorage.setItem('fairshift_worker_height', height);
    localStorage.setItem('fairshift_worker_phone', workerPhone);
    setIsProfileModalOpen(false);
    showToast('Worker health vitals & bio-metrics saved!', 'success');
  };

  const handleToggleLocation = () => {
    if (!useLocationEnabled) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const roundedLat = Number(pos.coords.latitude.toFixed(2));
            const roundedLon = Number(pos.coords.longitude.toFixed(2));
            localStorage.setItem(
              'fairshift_custom_location',
              JSON.stringify({ lat: roundedLat, lon: roundedLon })
            );
            setUseLocationEnabled(true);
          },
          () => {}
        );
      }
    } else {
      localStorage.removeItem('fairshift_custom_location');
      setUseLocationEnabled(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (e) {
      router.push('/');
    }
  };

  const navItems = [
    { href: '/app', label: t('nav.home'), icon: Home },
    { href: '/app/money', label: t('nav.money'), icon: IndianRupee },
    { href: '/app/safety', label: t('nav.safety'), icon: ShieldAlert },
    { href: '/app/speak-up', label: t('nav.speak_up'), icon: Megaphone },
    { href: '/app/rights', label: t('nav.rights'), icon: BookOpen },
  ];

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full min-h-screen pb-20">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div
          role="alert"
          className="bg-warn text-black px-4 py-2 text-sm font-bold flex items-center justify-between shadow sticky top-0 z-40"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>{t('worker.offline_banner')}</span>
          </div>
        </div>
      )}

      {/* Top Header with Clickable Profile & Vitals */}
      <header className="p-3.5 flex items-center justify-between border-b border-grey-900 bg-obsidian/70 backdrop-blur-md sticky top-0 z-30">
        <button
          type="button"
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center gap-3 text-start hover:opacity-90 active:scale-98 transition-all group"
          title="Click to view & edit worker health vitals and profile photo"
        >
          <div className="relative w-11 h-11 rounded-full overflow-hidden bg-lime text-black flex items-center justify-center font-extrabold text-base shadow border-2 border-lime/60 group-hover:scale-105 transition-transform">
            {workerAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={workerAvatar} alt="Worker Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>SD</span>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold text-text group-hover:text-lime">Sunita Devi</span>
              <span className="px-1.5 py-0.2 rounded bg-danger/20 border border-danger/40 text-danger text-[10px] font-black">
                {bloodGroup}
              </span>
            </div>
            <span className="text-[11px] text-grey-400 block">
              SRMIST Campus &bull; Age {age} &bull; {weight}kg
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <img
            src="/images/hisaab-logo.jpg"
            alt="Hisaab"
            className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 border border-lime/40 shadow-sm"
          />
          <ReadAloudButton className="p-2" />
          <button
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Open settings"
            className="p-2 rounded-xl bg-grey-900 border border-grey-700 text-grey-300 hover:text-text active:scale-95"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      <div className="flex-1 p-4">{children}</div>

      {/* Bottom Navigation (Strictly 64px high with Icon AND Text) */}
      <nav
        aria-label="Main application tabs"
        className="fixed bottom-0 start-0 end-0 z-40 bg-obsidian/95 border-t border-grey-700 backdrop-blur-xl h-16 max-w-md mx-auto flex items-center justify-around px-2"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center h-full gap-0.5 select-none transition-colors active:scale-95 ${
                isActive ? 'text-lime font-bold' : 'text-grey-300 hover:text-text'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} aria-hidden="true" />
              <span className="text-[11px] leading-tight text-center truncate max-w-[68px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* MODAL 1: Worker Medical Bio & Profile Picture */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Worker Profile & Medical Vitals"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Profile Picture Upload / Snap */}
          <div className="p-4 rounded-xl bg-grey-900 border border-grey-700 text-center space-y-3">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-lime text-black mx-auto flex items-center justify-center font-extrabold text-2xl shadow-lg border-2 border-lime">
              {workerAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={workerAvatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>SD</span>
              )}
            </div>

            <div className="flex justify-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-grey-800 border border-grey-600 text-xs font-bold text-text hover:bg-grey-700 active:scale-95 transition-all">
                <Camera className="w-3.5 h-3.5 text-lime" />
                <span>Snap Camera Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleProfilePhotoUpload}
                  className="hidden"
                />
              </label>

              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-grey-800 border border-grey-600 text-xs font-bold text-text hover:bg-grey-700 active:scale-95 transition-all">
                <Upload className="w-3.5 h-3.5 text-lime" />
                <span>Choose from Gallery</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-[11px] text-grey-400">
              Photo will appear on your verified shift receipts and gate muster
            </p>
          </div>

          {/* Vitals Form Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-grey-300">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-grey-900 border border-grey-700 text-text text-sm font-bold focus:ring-2 focus:ring-lime"
              >
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                  <option key={bg} value={bg}>
                    🩸 {bg}
                  </option>
                ))}
              </select>
            </div>

            <Field
              id="worker-age"
              label="Age (Years)"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="worker-weight"
              label="Body Weight (BW in kg)"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />

            <Field
              id="worker-height"
              label="Height (in cm)"
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </div>

          <Field
            id="worker-phone"
            label="Phone Number"
            value={workerPhone}
            onChange={(e) => setWorkerPhone(e.target.value)}
            placeholder="999999999"
          />

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsProfileModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="flex-1">
              Save Medical Bio
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Settings Modal */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title={t('settings.title')}>
        <div className="space-y-6">
          <div>
            <label className="text-sm font-bold text-grey-300 mb-2 block">{t('settings.language')}</label>
            <LanguageSwitcher className="w-full justify-between" />
          </div>

          <div>
            <label className="text-sm font-bold text-grey-300 mb-2 block">{t('settings.theme')}</label>
            <ThemeSwitcher className="w-full justify-between" />
          </div>

          <div>
            <label className="text-sm font-bold text-grey-300 mb-2 block">{t('settings.sky_effects')}</label>
            <div className="flex gap-2">
              {(['auto', 'reduced', 'off'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSkyEffects(mode)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border capitalize transition-all ${
                    skyEffects === mode
                      ? 'bg-lime text-black border-lime'
                      : 'bg-grey-900 text-grey-300 border-grey-700'
                  }`}
                >
                  {t(`settings.sky_${mode}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-grey-900 border border-grey-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-5 h-5 text-lime" />
              <div className="text-start">
                <span className="text-sm font-bold block">{t('settings.use_location')}</span>
                <span className="text-xs text-grey-500">Coarsened GPS &bull; Verified on Worksite Map</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={useLocationEnabled}
              onChange={handleToggleLocation}
              aria-label="Use coarse location"
              className="w-5 h-5 accent-lime rounded cursor-pointer"
            />
          </div>

          <div className="pt-2 border-t border-grey-700">
            <Button
              variant="danger"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              <span>{t('settings.logout')}</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
