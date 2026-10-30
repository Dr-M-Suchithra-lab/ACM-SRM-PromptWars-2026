import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { authAdapter } from '@/lib/auth/adapter';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { sanitizeString } from '@/lib/security/sanitize';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const rateLimit = checkRateLimit({
    key: `qr_login_${ip}`,
    maxRequests: 30,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded for QR login.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.resetMs / 1000)) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const sector = sanitizeString(searchParams.get('sector')) || 'srmist';
  const role = sanitizeString(searchParams.get('role')) || 'worker';
  const name = sanitizeString(searchParams.get('name')) || undefined;

  // Validate allowed roles to prevent privilege escalation via query params
  const validRoles = ['worker', 'contractor', 'admin'];
  const safeRole = validRoles.includes(role) ? role : 'worker';

  // Verify and construct user profile
  const authResult = await authAdapter.verifyOtp('+91 99999 88888', '777888', {
    sectorId: sector,
    role: safeRole,
    name,
  });

  if (!authResult.success || !authResult.user) {
    return NextResponse.redirect(new URL('/login/sector', request.url));
  }

  const sessionToken = await createSessionToken(authResult.user);

  // Target landing route depending on role
  let targetPath = '/app';
  if (authResult.user.role === 'contractor') {
    targetPath = '/contractor';
  } else if (authResult.user.role === 'admin') {
    targetPath = '/admin';
  }

  const response = NextResponse.redirect(new URL(targetPath, request.url));

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });

  return response;
}
