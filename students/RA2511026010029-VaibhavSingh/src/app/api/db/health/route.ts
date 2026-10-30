import { NextResponse } from 'next/server';
import { getMongoDbHealth } from '@/lib/db/mongodb';
import { checkRateLimit } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Extract client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const rateLimit = checkRateLimit({
    key: `db_health_${ip}`,
    maxRequests: 60,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.resetMs / 1000)) } }
    );
  }

  try {
    const health = await getMongoDbHealth();
    return NextResponse.json({
      success: true,
      database: health,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to inspect database health' },
      { status: 500 }
    );
  }
}
