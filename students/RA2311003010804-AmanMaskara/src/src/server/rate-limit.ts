/**
 * In-memory token-bucket rate limiter.
 * Reusable for login, AI routes, etc.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimiterConfig {
  /** Maximum tokens (requests) per window */
  maxTokens: number;
  /** Refill interval in milliseconds */
  refillIntervalMs: number;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxTokens: 5,
  refillIntervalMs: 15 * 60 * 1000, // 15 minutes
};

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private config: RateLimiterConfig;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if a request is allowed for the given key.
   * Returns true if allowed, false if rate limited.
   */
  check(key: string, now: number = Date.now()): boolean {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.config.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens if interval has passed
    const elapsed = now - bucket.lastRefill;
    if (elapsed >= this.config.refillIntervalMs) {
      bucket.tokens = this.config.maxTokens;
      bucket.lastRefill = now;
    }

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Get remaining tokens for a key.
   */
  remaining(key: string, now: number = Date.now()): number {
    const bucket = this.buckets.get(key);
    if (!bucket) return this.config.maxTokens;

    const elapsed = now - bucket.lastRefill;
    if (elapsed >= this.config.refillIntervalMs) {
      return this.config.maxTokens;
    }

    return bucket.tokens;
  }

  /**
   * Reset a specific key.
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Clear all buckets.
   */
  clear(): void {
    this.buckets.clear();
  }
}

// Shared login rate limiter instance
export const loginRateLimiter = new RateLimiter({
  maxTokens: 5,
  refillIntervalMs: 15 * 60 * 1000, // 15 min
});
