// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

describe('Middleware Role Protection', () => {
  it('redirects unauthenticated worker requests to /login/sector', async () => {
    const req = new NextRequest('http://localhost:3000/app');
    const res = await middleware(req);

    expect(res.status).toBe(307); // Next.js redirect
    expect(res.headers.get('location')).toContain('/login/sector');
  });

  it('permits authenticated worker to access /app', async () => {
    const token = await createSessionToken({
      id: 'worker-sunita',
      name: 'Sunita Devi',
      role: 'worker',
      sectorId: 'srmist',
      siteName: 'SRMIST Campus',
    });

    const req = new NextRequest('http://localhost:3000/app', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('blocks worker role from accessing /contractor and redirects to /app', async () => {
    const workerToken = await createSessionToken({
      id: 'worker-sunita',
      name: 'Sunita Devi',
      role: 'worker',
      sectorId: 'srmist',
      siteName: 'SRMIST Campus',
    });

    const req = new NextRequest('http://localhost:3000/contractor', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${workerToken}`,
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/app');
  });

  it('blocks worker and contractor roles from accessing /admin', async () => {
    const contractorToken = await createSessionToken({
      id: 'contractor-balaji',
      name: 'Balaji Facility Services',
      role: 'contractor',
      sectorId: 'srmist',
      siteName: 'SRMIST Campus',
    });

    const req = new NextRequest('http://localhost:3000/admin', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${contractorToken}`,
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/login');
  });

  it('permits admin role to access /admin', async () => {
    const adminToken = await createSessionToken({
      id: 'admin-srmist',
      name: 'Campus Admin',
      role: 'admin',
      sectorId: 'srmist',
      siteName: 'Central Administration',
    });

    const req = new NextRequest('http://localhost:3000/admin', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(200);
  });
});
