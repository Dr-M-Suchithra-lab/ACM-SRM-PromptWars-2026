import { NextResponse } from 'next/server';
import { db } from '@/lib/db/mongodb';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { sanitizeObject } from '@/lib/security/sanitize';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const rateLimit = checkRateLimit({
    key: `db_sync_${ip}`,
    maxRequests: 30,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before syncing.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.resetMs / 1000)) } }
    );
  }

  // Verify authentication
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map((c) => {
      const [k, ...v] = c.split('=');
      return [k, v.join('=')];
    })
  );
  const sessionToken = cookies[SESSION_COOKIE_NAME];
  const user = sessionToken ? await verifySessionToken(sessionToken) : null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Valid session required.' }, { status: 401 });
  }

  try {
    const rawBody = await request.json();
    const sanitizedBody = sanitizeObject(rawBody) as any;
    const { action, collection, data } = sanitizedBody;

    // Strict user authorization: workers can only modify their own documents
    if (user.role === 'worker' && data?.workerId && data.workerId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only access and sync your own records.' },
        { status: 403 }
      );
    }

    if (action === 'save_shift' && data) {
      const shiftDoc = {
        _id: data.id || `shift_${Date.now()}`,
        workerId: user.id,
        workerName: user.name,
        sectorId: user.sectorId,
        zone: data.zone || 'Designated Zone',
        shiftDate: data.shiftDate || new Date().toISOString().split('T')[0],
        shiftStart: data.shiftStart || '08:00 AM',
        hoursWorked: Number(data.hoursWorked) || 8,
        standardHours: 8,
        restHoursBeforeShift: Number(data.restHoursBeforeShift) || 11.5,
        coords: data.coords || { lat: 12.8234, lon: 80.0451 },
        safetyPhotoUrl: data.safetyPhotoUrl,
        safetyPhotoTimestamp: data.safetyPhotoTimestamp,
        safetyPhotoStatus: data.safetyPhotoStatus || 'VERIFIED',
        ppeItems: data.ppeItems || [],
        twoKeyVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.shifts.insertOne(shiftDoc);
      return NextResponse.json({ success: true, message: 'Shift recorded to MongoDB.', shift: shiftDoc });
    }

    if (action === 'get_worker_data') {
      const workerShifts = await db.shifts.find({ workerId: user.id });
      const workerReceipts = await db.receipts.find({ workerId: user.id });
      return NextResponse.json({
        success: true,
        shifts: workerShifts,
        receipts: workerReceipts,
      });
    }

    return NextResponse.json({ success: true, message: 'Synced with database.' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal database error during sync.' }, { status: 500 });
  }
}
