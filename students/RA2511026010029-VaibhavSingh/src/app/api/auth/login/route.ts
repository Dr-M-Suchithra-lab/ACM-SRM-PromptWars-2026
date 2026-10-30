import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { authAdapter } from '@/lib/auth/adapter';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { sanitizeObject } from '@/lib/security/sanitize';
import { z } from 'zod';

const LoginRequestSchema = z.object({
  type: z.enum(['otp', 'qr', 'demo', 'admin']),
  phone: z.string().optional(),
  code: z.string().optional(),
  qrPayload: z.string().optional(),
  sectorId: z.string().default('srmist'),
  role: z.string().default('worker'),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // IP rate limiting against brute-force credential stuffing
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const rateLimit = checkRateLimit({
    key: `auth_login_${ip}`,
    maxRequests: 15,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many authentication attempts. Please try again in 1 minute.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.resetMs / 1000)) } }
    );
  }

  try {
    const rawBody = await request.json();
    const sanitizedBody = sanitizeObject(rawBody);
    const parsed = LoginRequestSchema.safeParse(sanitizedBody);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid login parameters' }, { status: 400 });
    }

    const { type, phone, code, qrPayload, sectorId, role, name } = parsed.data;

    let authResult;

    if (type === 'qr' && qrPayload) {
      authResult = await authAdapter.verifyQrBadge(qrPayload, { name });
    } else if (type === 'otp' || type === 'demo') {
      const otpCode = code || (type === 'demo' ? '777888' : '');
      authResult = await authAdapter.verifyOtp(phone || '+91 98765 43210', otpCode, {
        sectorId,
        role,
        name,
      });
    } else if (type === 'admin') {
      authResult = await authAdapter.verifyOtp(phone || '+91 90000 00001', code || '123456', {
        sectorId: sectorId || 'srmist',
        role: 'admin',
        name: name || 'Principal Workplace Inspector',
      });
    } else {
      return NextResponse.json({ success: false, error: 'Unsupported authentication method' }, { status: 400 });
    }

    if (!authResult || !authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult?.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    const sessionToken = await createSessionToken(authResult.user);

    const response = NextResponse.json({
      success: true,
      user: authResult.user,
    });

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
  } catch (error) {
    // Mask internal error details in production
    return NextResponse.json({ success: false, error: 'Authentication service error' }, { status: 500 });
  }
}
