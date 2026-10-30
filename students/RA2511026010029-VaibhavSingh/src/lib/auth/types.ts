export interface AuthUser {
  id: string;
  name: string;
  role: 'worker' | 'contractor' | 'admin';
  sectorId: string;
  siteName: string;
}

export interface AuthProvider {
  name: string;
  sendOtp(phone: string): Promise<{ success: boolean; demoOtp?: string; message: string }>;
  verifyOtp(
    phone: string,
    code: string,
    context?: { sectorId?: string; role?: string; name?: string }
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }>;
  verifyQrBadge(
    payload: string,
    context?: { name?: string }
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }>;
}
