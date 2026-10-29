import { AuthProvider, AuthUser } from './types';
import { SEED_USERS } from '../storage/seedData';

import { SECTORS } from '@/config/sectors';

export const DEMO_OTP_CODE = '777888';
export const DEMO_PASSWORDS = ['12345', '123456', '777888', 'demo', 'admin123', ''];

export class FairShiftAuthAdapter implements AuthProvider {
  name = 'FairShiftAuthAdapter';

  private isDemoMode(): boolean {
    if (process.env.DEMO_MODE === 'false' || process.env.NEXT_PUBLIC_DEMO_MODE === 'false') {
      return false;
    }
    return true;
  }

  async sendOtp(phone: string): Promise<{ success: boolean; demoOtp?: string; message: string }> {
    return {
      success: true,
      demoOtp: '12345',
      message: 'Demo mode active: Use passcode 12345 or 123456.',
    };
  }

  async verifyOtp(
    phone: string,
    code: string,
    context?: { sectorId?: string; role?: string; name?: string }
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    const cleanCode = (code || '').trim();
    const demoMode = this.isDemoMode();

    if (!demoMode && (DEMO_PASSWORDS.includes(cleanCode) || cleanCode === DEMO_OTP_CODE)) {
      return {
        success: false,
        error: 'Demo OTP is rejected in production mode.',
      };
    }

    // In demo mode, accept demo codes (12345, 123456, 777888, demo, etc.) or any standard test input
    const isDemoCode = demoMode && (DEMO_PASSWORDS.includes(cleanCode) || cleanCode.length >= 4 || cleanCode === '');

    if (isDemoCode) {
      const targetRole = (context?.role || 'worker').toLowerCase();
      const sectorId = context?.sectorId || 'srmist';
      const sectorConfig = SECTORS[sectorId] || SECTORS.srmist;
      let matchedUser: AuthUser;

      if (targetRole === 'admin' || targetRole === 'inspector') {
        matchedUser = {
          id: `admin-${sectorId}`,
          name: context?.name || 'Principal Workplace Inspector',
          role: 'admin',
          sectorId,
          siteName: sectorConfig.name,
        };
      } else if (targetRole === 'thekedar' || targetRole === 'contractor' || targetRole === 'manager') {
        const contractorNames: Record<string, string> = {
          srmist: 'Balaji Facility Services',
          metro: 'L&T Metro Civil Contractors',
          hospital: 'Apollo Facility Allied Services',
        };
        matchedUser = {
          id: `contractor-${sectorId}`,
          name: context?.name || contractorNames[sectorId] || 'Authorized Labour Contractor',
          role: 'contractor',
          sectorId,
          siteName: sectorConfig.name,
        };
      } else {
        const workerNames: Record<string, string> = {
          srmist: 'Sunita Devi',
          metro: 'Ramesh Kumar (Welder)',
          hospital: 'Priya Sharma (Sanitation)',
        };
        matchedUser = {
          id: `worker-${sectorId}-${Date.now().toString().slice(-4)}`,
          name: context?.name || workerNames[sectorId] || 'Sunita Devi',
          role: 'worker',
          sectorId,
          siteName: sectorConfig.name,
        };
      }

      return {
        success: true,
        user: matchedUser,
      };
    }

    // For non-demo verification:
    if (cleanCode.length === 6 && /^\d+$/.test(cleanCode)) {
      const sectorId = context?.sectorId || 'srmist';
      const sectorConfig = SECTORS[sectorId] || SECTORS.srmist;
      return {
        success: true,
        user: {
          id: `usr-${Date.now().toString().slice(-6)}`,
          name: context?.name || 'Worker Companion',
          role: (context?.role as 'worker' | 'contractor' | 'admin') || 'worker',
          sectorId,
          siteName: sectorConfig.name,
        },
      };
    }

    return {
      success: false,
      error: 'Passcode must be a 6-digit number (or use demo code 777888).',
    };
  }

  async verifyQrBadge(
    payload: string,
    context?: { name?: string }
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    // Format: fairshift:v1:<siteId>:<role>:<signature> OR 6-digit site code
    const parts = payload.trim().split(':');

    if (parts.length >= 4 && parts[0] === 'fairshift' && parts[1] === 'v1') {
      const siteId = parts[2];
      const roleStr = parts[3].toLowerCase();
      const role: 'worker' | 'contractor' | 'admin' =
        roleStr === 'admin' ? 'admin' : roleStr === 'contractor' || roleStr === 'thekedar' ? 'contractor' : 'worker';

      return {
        success: true,
        user: {
          id: `qr-usr-${Date.now().toString().slice(-5)}`,
          name: context?.name || 'Badge Verified Worker',
          role,
          sectorId: siteId,
          siteName: `${siteId.toUpperCase()} Site Badge`,
        },
      };
    }

    // Fallback: 6-digit site code (e.g. "882190")
    if (/^\d{6}$/.test(payload.trim())) {
      return {
        success: true,
        user: {
          id: `manual-usr-${payload.trim()}`,
          name: context?.name || 'Site Code Worker',
          role: 'worker',
          sectorId: 'srmist',
          siteName: `Worksite Code #${payload.trim()}`,
        },
      };
    }

    return {
      success: false,
      error: 'Unrecognized work badge format. Expected fairshift:v1:... or 6-digit badge number.',
    };
  }
}

export const authAdapter = new FairShiftAuthAdapter();
