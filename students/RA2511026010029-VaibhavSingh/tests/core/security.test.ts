// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, timingSafeEqual } from '@/lib/security/hash';
import { sanitizeString, sanitizeObject, escapeHtml } from '@/lib/security/sanitize';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { getMongoDbHealth, db } from '@/lib/db/mongodb';

describe('Security & Cryptography Suite', () => {
  it('hashes passwords with PBKDF2-SHA256 and verifies correctly', async () => {
    const password = 'SecretPassword123!';
    const { hash, salt } = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // 32 bytes hex
    expect(salt).toBeDefined();
    expect(salt.length).toBe(32); // 16 bytes hex

    const isValid = await verifyPassword(password, hash, salt);
    expect(isValid).toBe(true);

    const isWrongValid = await verifyPassword('WrongPassword', hash, salt);
    expect(isWrongValid).toBe(false);
  });

  it('performs constant-time comparison in timingSafeEqual', () => {
    expect(timingSafeEqual('hash123', 'hash123')).toBe(true);
    expect(timingSafeEqual('hash123', 'hash999')).toBe(false);
    expect(timingSafeEqual('hash123', 'short')).toBe(false);
  });

  it('sanitizes malicious script tags and XSS attack vectors', () => {
    const malicious = '<script>alert("XSS")</script>Hello <img src="x" onerror="stealCookies()">World';
    const cleaned = sanitizeString(malicious);

    expect(cleaned).not.toContain('<script>');
    expect(cleaned).not.toContain('onerror=');
    expect(cleaned).toContain('Hello');
    expect(cleaned).toContain('World');
  });

  it('sanitizes nested objects and arrays', () => {
    const dirtyPayload = {
      name: 'Sunita Devi',
      note: '<script>evil()</script>Normal Note',
      tags: ['safe', 'javascript:alert(1)'],
      nested: {
        comment: '<iframe src="evil.com"></iframe>Clean comment',
      },
    };

    const sanitized = sanitizeObject(dirtyPayload);
    expect(sanitized.note).toBe('Normal Note');
    expect(sanitized.tags[1]).toBe('alert(1)');
    expect(sanitized.nested.comment).toBe('Clean comment');
  });

  it('enforces rate limiting with sliding window', () => {
    const key = `test_rate_limit_${Date.now()}`;
    const options = { key, maxRequests: 3, windowMs: 10000 };

    const req1 = checkRateLimit(options);
    expect(req1.allowed).toBe(true);
    expect(req1.remaining).toBe(2);

    const req2 = checkRateLimit(options);
    expect(req2.allowed).toBe(true);
    expect(req2.remaining).toBe(1);

    const req3 = checkRateLimit(options);
    expect(req3.allowed).toBe(true);
    expect(req3.remaining).toBe(0);

    // 4th request must be blocked
    const req4 = checkRateLimit(options);
    expect(req4.allowed).toBe(false);
    expect(req4.remaining).toBe(0);
    expect(req4.resetMs).toBeGreaterThan(0);
  });

  it('returns valid MongoDB Atlas database health for vaibhavnr06@gmail.com', async () => {
    const health = await getMongoDbHealth();

    expect(health.databaseName).toBe('fairshift_hisaab');
    expect(health.registeredUser).toBe('vaibhavnr06@gmail.com');
    expect(health.security.sslEnabled).toBe(true);
    expect(health.collections.users).toBeGreaterThan(0);
    expect(health.collections.shifts).toBeGreaterThan(0);
    expect(health.collections.hazards).toBeGreaterThan(0);
  });

  it('supports MongoDB collection queries and mutations', async () => {
    const users = await db.users.find({ role: 'worker' });
    expect(users.length).toBeGreaterThan(0);

    const sunita = await db.users.findOne({ _id: 'worker-sunita' });
    expect(sunita).toBeDefined();
    expect(sunita?.name).toBe('Sunita Devi');
  });
});
