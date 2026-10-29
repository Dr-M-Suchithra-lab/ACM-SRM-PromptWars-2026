import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get('sector') || 'srmist';
    const role = searchParams.get('role') || 'worker';
    const name = searchParams.get('name') || '';

    // Determine target host from request headers
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');

    const qrLoginUrl = `${proto}://${host}/api/auth/qr-login?sector=${encodeURIComponent(sector)}&role=${encodeURIComponent(role)}${name ? `&name=${encodeURIComponent(name)}` : ''}`;

    const svg = await QRCode.toString(qrLoginUrl, {
      type: 'svg',
      margin: 2,
      color: {
        dark: '#0A0B0A',
        light: '#FFFFFF',
      },
    });

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
