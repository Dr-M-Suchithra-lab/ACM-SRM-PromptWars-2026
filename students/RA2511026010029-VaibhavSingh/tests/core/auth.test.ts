// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getRolesForSector } from '@/config/roles';
import { FairShiftAuthAdapter, DEMO_OTP_CODE } from '@/lib/auth/adapter';
import { createSessionToken, verifySessionToken } from '@/lib/auth/session';

describe('Authentication and Role Security', () => {
  const originalDemoMode = process.env.DEMO_MODE;
  const originalNextPublicDemo = process.env.NEXT_PUBLIC_DEMO_MODE;

  afterEach(() => {
    process.env.DEMO_MODE = originalDemoMode;
    process.env.NEXT_PUBLIC_DEMO_MODE = originalNextPublicDemo;
  });

  it('returns sector-specific roles from config for construction', () => {
    const roles = getRolesForSector('construction');
    const ids = roles.map((r) => r.id);
    expect(ids).toContain('worker');
    expect(ids).toContain('thekedar');
  });

  it('returns sector-specific roles from config for srmist facility', () => {
    const roles = getRolesForSector('srmist');
    const ids = roles.map((r) => r.id);
    expect(ids).toContain('staff');
    expect(ids).toContain('contractor');
  });

  it('returns sector-specific roles from config for office', () => {
    const roles = getRolesForSector('office');
    const ids = roles.map((r) => r.id);
    expect(ids).toContain('employee');
    expect(ids).toContain('manager');
  });

  it('accepts demo OTP when DEMO_MODE is true', async () => {
    process.env.DEMO_MODE = 'true';
    delete process.env.NEXT_PUBLIC_DEMO_MODE;

    const adapter = new FairShiftAuthAdapter();
    const result = await adapter.verifyOtp('+91 99999 88888', DEMO_OTP_CODE, {
      sectorId: 'srmist',
      role: 'worker',
      name: 'Sunita Devi',
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.role).toBe('worker');
  });

  it('strictly rejects demo OTP when DEMO_MODE is false', async () => {
    process.env.DEMO_MODE = 'false';
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false';

    const adapter = new FairShiftAuthAdapter();
    const result = await adapter.verifyOtp('+91 99999 88888', DEMO_OTP_CODE);

    expect(result.success).toBe(false);
    expect(result.error).toContain('rejected in production mode');
  });

  it('parses valid QR badge payload and 6-digit site fallback', async () => {
    const adapter = new FairShiftAuthAdapter();

    // QR badge format
    const qrResult = await adapter.verifyQrBadge('fairshift:v1:srmist:worker:sig12345');
    expect(qrResult.success).toBe(true);
    expect(qrResult.user?.role).toBe('worker');
    expect(qrResult.user?.sectorId).toBe('srmist');

    // 6-digit site fallback
    const codeResult = await adapter.verifyQrBadge('882190');
    expect(codeResult.success).toBe(true);
    expect(codeResult.user?.siteName).toContain('882190');
  });

  it('creates and verifies cryptographically signed 8-hour JWT session', async () => {
    const user = {
      id: 'worker-sunita',
      name: 'Sunita Devi',
      role: 'worker' as const,
      sectorId: 'srmist',
      siteName: 'SRMIST Campus',
    };

    const token = await createSessionToken(user);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = await verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe('worker-sunita');
    expect(decoded?.role).toBe('worker');
  });
});
