import {
  Inject,
  Injectable,
  Logger,
  Module,
  type DynamicModule,
} from '@nestjs/common';
import { CacheModule as NestCacheModule, Cache } from '@nestjs/cache-manager';

/**
 * Options for configuring the {@link SharedCacheModule}.
 */
export interface SharedCacheModuleOptions {
  /** Default TTL in **milliseconds** for entries without an explicit TTL. */
  ttl?: number;
  /** Maximum number of items to store (in-memory store only). */
  max?: number;
  /** Whether to register the module globally. @defaultValue false */
  isGlobal?: boolean;
}

// ── CacheService ──────────────────────────────────────────────

/**
 * Injectable wrapper around `cache-manager`'s {@link Cache} instance
 * provided by `@nestjs/cache-manager`.
 *
 * Prefer injecting this service over using `Cache` directly — it adds
 * logging, a convenient `wrap` helper, and keeps a consistent API
 * across the application.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class FlightsService {
 *   constructor(private readonly cache: CacheService) {}
 *
 *   async search(origin: string, dest: string) {
 *     const key = buildCacheKey('flights', origin, dest);
 *     return this.cache.wrap(key, () => this.amadeus.search(origin, dest), 60_000);
 *   }
 * }
 * ```
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(Cache) private readonly cache: Cache) {}

  /**
   * Retrieve a cached value by key.
   *
   * @typeParam T - Expected type of the stored value.
   * @param key - The cache key.
   * @returns The cached value, or `undefined` on a miss.
   */
  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  /**
   * Retrieve multiple cached values at once.
   *
   * @typeParam T - Expected type of the stored values.
   * @param keys - Array of cache keys.
   * @returns An array of values (or `undefined` for misses), matching
   *   the order of `keys`.
   */
  async mget<T>(keys: string[]): Promise<Array<T | undefined>> {
    return this.cache.mget<T>(keys);
  }

  /**
   * Store a value under the given key with an optional TTL.
   *
   * @typeParam T - Type of the value to cache.
   * @param key   - The cache key.
   * @param value - The value to store.
   * @param ttl   - Time-to-live in **milliseconds**. When omitted the
   *   module-level default TTL is used.
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cache.set(key, value, ttl);
  }

  /**
   * Store multiple values at once.
   *
   * @typeParam T - Type of the values.
   * @param list - Array of `{ key, value, ttl? }` objects.
   */
  async mset<T>(
    list: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<void> {
    await this.cache.mset(list);
  }

  /**
   * Remove a single entry from the cache.
   *
   * @param key - The cache key to delete.
   */
  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }

  /**
   * Remove multiple entries at once.
   *
   * @param keys - Array of cache keys to delete.
   */
  async mdel(keys: string[]): Promise<void> {
    await this.cache.mdel(keys);
  }

  /**
   * Remove **all** entries from the cache.
   */
  async clear(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Get the remaining TTL (in ms) for a cached key.
   *
   * @param key - The cache key.
   * @returns The remaining TTL in milliseconds, or `undefined` if the
   *   key does not exist.
   */
  async ttl(key: string): Promise<number | undefined> {
    return this.cache.ttl(key);
  }

  /**
   * Cache-aside (read-through) helper — the `cache-manager` equivalent
   * of the old `cacheOrFetch`.
   *
   * Returns the cached value if it exists; otherwise calls `fn`, caches
   * the result with the given TTL, and returns it.
   *
   * @typeParam T  - Type of the cached / fetched value.
   * @param key    - The cache key.
   * @param fn     - Factory function invoked on a cache miss.
   * @param ttl    - Time-to-live in **milliseconds** for newly fetched values.
   * @returns The cached or freshly fetched value.
   *
   * @example
   * ```ts
   * const rate = await cacheService.wrap(
   *   buildCacheKey('rate', 'USD', 'MWK'),
   *   () => fetchExchangeRate('USD', 'MWK'),
   *   300_000,
   * );
   * ```
   */
  async wrap<T>(
    key: string,
    fn: () => T | Promise<T>,
    ttl?: number,
  ): Promise<T> {
    return this.cache.wrap<T>(key, fn, ttl);
  }

  /**
   * Gracefully disconnect from the underlying store (useful for Redis
   * or other external stores during shutdown).
   */
  async disconnect(): Promise<void> {
    await this.cache.disconnect();
    this.logger.log('Cache store disconnected');
  }
}

// ── SharedCacheModule ─────────────────────────────────────────

/**
 * NestJS module that configures `@nestjs/cache-manager` and exposes
 * a ready-to-inject {@link CacheService}.
 *
 * By default it uses the built-in in-memory store. Pass a custom
 * `stores` option via `CacheModule.registerAsync` in your app module
 * if you need Redis or another backend.
 *
 * @example
 * ```ts
 * // app.module.ts — basic in-memory cache
 * @Module({
 *   imports: [SharedCacheModule.register({ ttl: 60_000 })],
 * })
 * export class AppModule {}
 *
 * // app.module.ts — global cache
 * @Module({
 *   imports: [SharedCacheModule.register({ ttl: 60_000, isGlobal: true })],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class SharedCacheModule {
  /**
   * Register the cache module with static options.
   *
   * @param options - Optional {@link SharedCacheModuleOptions}.
   * @returns A configured `DynamicModule`.
   */
  static register(options: SharedCacheModuleOptions = {}): DynamicModule {
    const { ttl = 5_000, max = 1000, isGlobal = false } = options;

    return {
      module: SharedCacheModule,
      global: isGlobal,
      imports: [NestCacheModule.register({ ttl, max })],
      providers: [CacheService],
      exports: [CacheService, NestCacheModule],
    };
  }
}

// ── Standalone helpers ────────────────────────────────────────

/**
 * Build a colon-delimited cache key from a series of parts.
 *
 * @param parts - Strings or numbers to join with `:`.
 * @returns The composite cache key, e.g. `"flights:NBO:LLW:2026-03-01"`.
 *
 * @example
 * ```ts
 * buildCacheKey('flights', origin, destination, date);
 * // "flights:NBO:LLW:2026-03-01"
 * ```
 */
export function buildCacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}
