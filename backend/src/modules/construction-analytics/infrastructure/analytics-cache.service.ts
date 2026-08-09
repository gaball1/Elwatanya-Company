import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

const DEFAULT_TTL_MS = 60_000;
const BACKGROUND_INTERVAL_MS = 300_000;

@Injectable()
export class AnalyticsCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsCacheService.name);
  private readonly store = new Map<string, CacheEntry<any>>();
  private readonly pending = new Map<string, Promise<any>>();
  private backgroundTimer: NodeJS.Timeout | null = null;

  onModuleInit() {
    this.backgroundTimer = setInterval(() => this.prune(), BACKGROUND_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.backgroundTimer) clearInterval(this.backgroundTimer);
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): T {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs, createdAt: Date.now() });
    return value;
  }

  /** Memoize an async computation, deduplicating concurrent in-flight calls. */
  async memoize<T>(key: string, compute: () => Promise<T>, ttlMs: number = DEFAULT_TTL_MS): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight as Promise<T>;

    const promise = compute()
      .then((value) => {
        this.set(key, value, ttlMs);
        this.pending.delete(key);
        return value;
      })
      .catch((err) => {
        this.pending.delete(key);
        throw err;
      });

    this.pending.set(key, promise);
    return promise;
  }

  invalidate(prefix: string): void {
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  invalidateAll(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  private prune(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.log(`Pruned ${removed} expired analytics cache entries`);
    }
  }
}
