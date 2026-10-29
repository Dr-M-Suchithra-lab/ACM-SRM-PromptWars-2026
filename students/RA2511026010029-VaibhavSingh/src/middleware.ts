import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from './lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets, api routes, and public assets pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = sessionCookie ? await verifySessionToken(sessionCookie) : null;

  // 1. Worker Companion Guard (/app)
  if (pathname.startsWith('/app')) {
    if (!user) {
      const loginUrl = new URL('/login/sector', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Allow authenticated user
    return NextResponse.next();
  }

  // 2. Contractor Dashboard Guard (/contractor)
  if (pathname.startsWith('/contractor')) {
    if (!user) {
      const loginUrl = new URL('/login/sector', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (user.role !== 'contractor' && user.role !== 'admin') {
      return NextResponse.redirect(new URL('/app', request.url));
    }
    return NextResponse.next();
  }

  // 3. Admin Command Cockpit Guard (/admin)
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      if (user && user.role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.next();
    }

    if (!user || user.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/contractor/:path*', '/admin/:path*'],
};
