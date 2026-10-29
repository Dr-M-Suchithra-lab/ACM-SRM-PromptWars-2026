import { SignJWT, jwtVerify } from 'jose';
import { AuthUser } from './types';

const DEFAULT_SECRET = 'fairshift-super-secure-production-ready-secret-key-32chars!';
const SESSION_SECRET_STRING = process.env.SESSION_SECRET || DEFAULT_SECRET;
const SECRET_KEY = new TextEncoder().encode(SESSION_SECRET_STRING);

export const SESSION_COOKIE_NAME = 'fairshift_session';
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours

export async function createSessionToken(user: AuthUser): Promise<string> {
  const token = await new SignJWT({
    sub: user.id,
    name: user.name,
    role: user.role,
    sectorId: user.sectorId,
    siteName: user.siteName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET_KEY);

  return token;
}

export async function verifySessionToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      id: payload.sub as string,
      name: payload.name as string,
      role: payload.role as 'worker' | 'contractor' | 'admin',
      sectorId: (payload.sectorId as string) || 'srmist',
      siteName: (payload.siteName as string) || 'SRMIST Campus',
    };
  } catch (err) {
    return null;
  }
}
