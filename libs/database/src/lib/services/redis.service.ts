/**
 * @fileoverview Redis service for caching, pub/sub, and distributed locking
 * @module database/services
 * @description Manages named Redis connections via `ioredis` and exposes a
 * rich API covering:
 *
 * - **Key/value caching** — `get`, `set`, `delete`, `exists`, `mget`, `mset`
 * - **Atomic counters** — `incr`, `decr`
 * - **TTL management** — `expire`, `ttl`
 * - **Hash operations** — `hget`, `hset`, `hgetall`, `hdel`
 * - **List operations** — `lpush`, `rpush`, `lpop`, `rpop`, `lrange`, `llen`
 * - **Set operations** — `sadd`, `srem`, `smembers`, `sismember`, `scard`
 * - **Sorted-set operations** — `zadd`, `zrem`, `zrange`, `zrevrange`, `zcard`, `zscore`
 * - **Pub/Sub** — `publish`, `subscribe`, `unsubscribe`
 * - **Pipelined transactions** — `transaction`
 * - **Distributed locking** — `acquireLock`, `releaseLock`
 * - **Cache clearing** — `clearCache` (pattern-based or full flush)
 *
 * Each named connection automatically creates three `ioredis` instances:
 * a main client, a subscriber client (for pub/sub), and a publisher client.
 *
 * @author Outhan Chazima
 * @version 1.0.0
 */

import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import * as Redis from 'ioredis';
import {
  RedisConnectionConfig,
  CacheOptions,
} from '../interfaces/database.interface';
import { ConnectionManagerService } from './connection-manager.service';
import { REDIS_CONNECTIONS } from '../database.constants';

/**
 * Service for managing Redis connections and operations via ioredis.
 *
 * @class RedisService
 * @implements {OnModuleDestroy}
 * @description Provides named Redis client access plus convenience wrappers
 * for the most common Redis data structures, pub/sub messaging, pipelined
 * transactions, and distributed locking.
 *
 * @example
 * ```typescript
 * // Cache a user object for 1 hour
 * await redisService.set('cache', `user:${id}`, userData, { ttl: 3600 });
 *
 * // Retrieve it later
 * const cached = await redisService.get<User>('cache', `user:${id}`);
 *
 * // Distributed lock
 * const lock = await redisService.acquireLock('cache', 'invoice-gen', 30);
 * if (lock) {
 *   try { /* critical section *\/ } finally {
 *     await redisService.releaseLock('cache', 'invoice-gen', lock);
 *   }
 * }
 * ```
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  /** Logger scoped to this service */
  private readonly logger = new Logger(RedisService.name);

  /** Map of connection name → main Redis client */
  private readonly clients: Map<string, Redis.Redis> = new Map();

  /** Map of connection name → subscriber Redis client (for pub/sub) */
  private readonly subscribers: Map<string, Redis.Redis> = new Map();

  /** Map of connection name → publisher Redis client (for pub/sub) */
  private readonly publishers: Map<string, Redis.Redis> = new Map();

  /**
   * Creates an instance of RedisService.
   * @param connectionManager - Central registry for all database connections.
   */
  constructor(
    @Optional()
    @Inject(REDIS_CONNECTIONS)
    private readonly configs: Array<{
      name: string;
      config: RedisConnectionConfig;
    }> = [],
    private readonly connectionManager: ConnectionManagerService,
  ) {}

  /**
   * Initialise all registered Redis connections.
   *
   * For each config entry, creates a main client, subscriber, and publisher
   * via {@link createConnection}. Called by {@link DatabaseService.onModuleInit}.
   *
   * @throws Error if any connection fails to establish.
   */
  async initialize(): Promise<void> {
    for (const { name, config } of this.configs) {
      try {
        await this.createConnection(name, config);
        this.logger.log(`Redis connection '${name}' established successfully`);
      } catch (error) {
        this.logger.error(
          `Failed to establish Redis connection '${name}'`,
          error,
        );
        throw error;
      }
    }
  }

  /**
   * Create a Redis connection with main, subscriber, and publisher clients.
   *
   * Handles standard connections as well as Redis Sentinel configurations.
   * Sets up event listeners for ready/close/error states on all three clients.
   *
   * @param name - Connection name identifier.
   * @param config - Redis connection configuration.
   * @throws Error if the initial connection fails.
   */
  private async createConnection(
    name: string,
    config: RedisConnectionConfig,
  ): Promise<void> {
    const options: Redis.RedisOptions = {
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password,
      db: config.db || 0,
      keyPrefix: config.keyPrefix,
      retryStrategy:
        config.retryStrategy || ((times: number) => Math.min(times * 50, 2000)),
      enableReadyCheck: config.enableReadyCheck !== false,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      enableOfflineQueue: config.enableOfflineQueue !== false,
      connectTimeout: config.connectTimeout || 10000,
      disconnectTimeout: config.disconnectTimeout || 2000,
      commandTimeout: config.commandTimeout || 5000,
      autoResubscribe: config.autoResubscribe !== false,
      autoResendUnfulfilledCommands:
        config.autoResendUnfulfilledCommands !== false,
      lazyConnect: config.lazyConnect || false,
      tls: config.tls as Redis.RedisOptions['tls'],
    };

    // Handle Sentinel configuration
    if (config.sentinels?.length) {
      (options as any).sentinels = config.sentinels;
      (options as any).name = config.name;
      (options as any).role = config.role || 'master';
      if (config.preferredSlaves) {
        (options as any).preferredSlaves = config.preferredSlaves;
      }
    }

    // Create main client
    const client = new Redis.Redis(options);

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      client.once('ready', () => {
        this.clients.set(name, client);
        this.connectionManager.registerRedisConnection(name, client);
        resolve();
      });
      client.once('error', reject);
    });

    // Create subscriber client for pub/sub
    const subscriber = client.duplicate();
    this.subscribers.set(name, subscriber);

    // Create publisher client for pub/sub
    const publisher = client.duplicate();
    this.publishers.set(name, publisher);

    // Set up error handlers
    client.on('error', (error) => {
      this.logger.error(`Redis client error for '${name}':`, error);
    });

    subscriber.on('error', (error) => {
      this.logger.error(`Redis subscriber error for '${name}':`, error);
    });

    publisher.on('error', (error) => {
      this.logger.error(`Redis publisher error for '${name}':`, error);
    });
  }

  /**
   * Retrieve the main Redis client for a named connection.
   *
   * @param name - Connection name.
   * @returns The `ioredis` client instance.
   * @throws Error if no client with the given name exists.
   */
  getClient(name: string): Redis.Redis {
    const client = this.clients.get(name);
    if (!client) {
      throw new Error(`Redis client '${name}' not found`);
    }
    return client;
  }

  /**
   * Retrieve the **subscriber** Redis client for pub/sub.
   *
   * @param name - Connection name.
   * @returns The dedicated subscriber `ioredis` client.
   * @throws Error if no subscriber with the given name exists.
   */
  getSubscriber(name: string): Redis.Redis {
    const subscriber = this.subscribers.get(name);
    if (!subscriber) {
      throw new Error(`Redis subscriber '${name}' not found`);
    }
    return subscriber;
  }

  /**
   * Retrieve the **publisher** Redis client for pub/sub.
   *
   * @param name - Connection name.
   * @returns The dedicated publisher `ioredis` client.
   * @throws Error if no publisher with the given name exists.
   */
  getPublisher(name: string): Redis.Redis {
    const publisher = this.publishers.get(name);
    if (!publisher) {
      throw new Error(`Redis publisher '${name}' not found`);
    }
    return publisher;
  }

  /**
   * Retrieve a value from Redis, automatically JSON-parsing if possible.
   *
   * @template T - Expected return type (defaults to `any`).
   * @param clientName - Connection name.
   * @param key - Cache key.
   * @param options - Optional cache options (only `key` override is used).
   * @returns The cached value typed as `T`, or `null` if not found.
   */
  async get<T = any>(
    clientName: string,
    key: string,
    options?: CacheOptions,
  ): Promise<T | null> {
    const client = this.getClient(clientName);
    const fullKey = options?.key || key;

    try {
      const value = await client.get(fullKey);
      if (!value) {
        return null;
      }

      // Try to parse as JSON, otherwise return as string
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      this.logger.error(`Failed to get cache key '${fullKey}'`, error);
      return null;
    }
  }

  /**
   * Store a value in Redis with optional TTL.
   *
   * Non-string values are automatically JSON-serialised.
   *
   * @template T - Type of the value to store.
   * @param clientName - Connection name.
   * @param key - Cache key.
   * @param value - Value to store.
   * @param options - Optional cache options (`ttl` in seconds, default 3600).
   * @returns `true` on success, `false` on failure.
   */
  async set<T = any>(
    clientName: string,
    key: string,
    value: T,
    options?: CacheOptions,
  ): Promise<boolean> {
    const client = this.getClient(clientName);
    const fullKey = options?.key || key;
    const ttl = options?.ttl || 3600; // Default 1 hour

    try {
      const serialized =
        typeof value === 'string' ? value : JSON.stringify(value);

      if (ttl > 0) {
        await client.setex(fullKey, ttl, serialized);
      } else {
        await client.set(fullKey, serialized);
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to set cache key '${fullKey}'`, error);
      return false;
    }
  }

  /**
   * Delete a key from Redis.
   *
   * @param clientName - Connection name.
   * @param key - Cache key to delete.
   * @returns `true` if the key existed and was deleted, `false` otherwise.
   */
  async delete(clientName: string, key: string): Promise<boolean> {
    const client = this.getClient(clientName);

    try {
      const result = await client.del(key);
      return result > 0;
    } catch (error) {
      this.logger.error(`Failed to delete cache key '${key}'`, error);
      return false;
    }
  }

  /**
   * Check whether a key exists in Redis.
   *
   * @param clientName - Connection name.
   * @param key - Cache key to check.
   * @returns `true` if the key exists.
   */
  async exists(clientName: string, key: string): Promise<boolean> {
    const client = this.getClient(clientName);

    try {
      const result = await client.exists(key);
      return result > 0;
    } catch (error) {
      this.logger.error(`Failed to check existence of key '${key}'`, error);
      return false;
    }
  }

  /**
   * Retrieve multiple keys in a single round-trip (`MGET`).
   *
   * @template T - Expected type of each value.
   * @param clientName - Connection name.
   * @param keys - Array of cache keys.
   * @returns Array of values (or `null` for missing keys), in the same order.
   */
  async mget<T = any>(
    clientName: string,
    keys: string[],
  ): Promise<(T | null)[]> {
    const client = this.getClient(clientName);

    try {
      const values = await client.mget(...keys);
      return values.map((value) => {
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      });
    } catch (error) {
      this.logger.error(`Failed to get multiple keys`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs in a single pipelined operation.
   *
   * Each item can optionally specify its own TTL.
   *
   * @template T - Type of the values to store.
   * @param clientName - Connection name.
   * @param items - Array of `{ key, value, ttl? }` objects.
   * @returns `true` on success, `false` on failure.
   */
  async mset<T = any>(
    clientName: string,
    items: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<boolean> {
    const client = this.getClient(clientName);
    const pipeline = client.pipeline();

    try {
      for (const item of items) {
        const serialized =
          typeof item.value === 'string'
            ? item.value
            : JSON.stringify(item.value);

        if (item.ttl && item.ttl > 0) {
          pipeline.setex(item.key, item.ttl, serialized);
        } else {
          pipeline.set(item.key, serialized);
        }
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.error(`Failed to set multiple keys`, error);
      return false;
    }
  }

  /**
   * Atomically increment a numeric key.
   *
   * @param clientName - Connection name.
   * @param key - Key holding a numeric value.
   * @param increment - Amount to increment by (default `1`).
   * @returns The new value after incrementing.
   * @throws Error if the key holds a non-numeric value.
   */
  async incr(clientName: string, key: string, increment = 1): Promise<number> {
    const client = this.getClient(clientName);

    try {
      if (increment === 1) {
        return await client.incr(key);
      } else {
        return await client.incrby(key, increment);
      }
    } catch (error) {
      this.logger.error(`Failed to increment key '${key}'`, error);
      throw error;
    }
  }

  /**
   * Atomically decrement a numeric key.
   *
   * @param clientName - Connection name.
   * @param key - Key holding a numeric value.
   * @param decrement - Amount to decrement by (default `1`).
   * @returns The new value after decrementing.
   * @throws Error if the key holds a non-numeric value.
   */
  async decr(clientName: string, key: string, decrement = 1): Promise<number> {
    const client = this.getClient(clientName);

    try {
      if (decrement === 1) {
        return await client.decr(key);
      } else {
        return await client.decrby(key, decrement);
      }
    } catch (error) {
      this.logger.error(`Failed to decrement key '${key}'`, error);
      throw error;
    }
  }

  /**
   * Set a TTL (time-to-live) on an existing key.
   *
   * @param clientName - Connection name.
   * @param key - Key to set expiration on.
   * @param ttl - Time-to-live in **seconds**.
   * @returns `true` if the timeout was set, `false` if the key does not exist.
   */
  async expire(clientName: string, key: string, ttl: number): Promise<boolean> {
    const client = this.getClient(clientName);

    try {
      const result = await client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to set expiration on key '${key}'`, error);
      return false;
    }
  }

  /**
   * Get the remaining TTL of a key in seconds.
   *
   * @param clientName - Connection name.
   * @param key - Cache key.
   * @returns Remaining seconds, `-1` if no TTL is set, `-2` if the key doesn't exist.
   */
  async ttl(clientName: string, key: string): Promise<number> {
    const client = this.getClient(clientName);

    try {
      return await client.ttl(key);
    } catch (error) {
      this.logger.error(`Failed to get TTL of key '${key}'`, error);
      return -1;
    }
  }

  /**
   * Clear cache entries across **all** connections.
   *
   * If a `pattern` is provided, only keys matching the glob are deleted.
   * Otherwise, the entire database is flushed (`FLUSHDB`).
   *
   * @param pattern - Optional glob pattern (e.g. `'user:*'`).
   */
  async clearCache(pattern?: string): Promise<void> {
    for (const [name, client] of this.clients) {
      try {
        if (pattern) {
          const keys = await client.keys(pattern);
          if (keys.length > 0) {
            await client.del(...keys);
            this.logger.log(
              `Cleared ${keys.length} keys matching pattern '${pattern}' from '${name}'`,
            );
          }
        } else {
          await client.flushdb();
          this.logger.log(`Cleared all keys from '${name}'`);
        }
      } catch (error) {
        this.logger.error(`Failed to clear cache for '${name}'`, error);
      }
    }
  }

  /**
   * Get a single field from a Redis hash.
   *
   * @param clientName - Connection name.
   * @param key - Hash key.
   * @param field - Field name within the hash.
   * @returns The field value, or `null` if the field/key doesn't exist.
   */
  async hget(
    clientName: string,
    key: string,
    field: string,
  ): Promise<string | null> {
    const client = this.getClient(clientName);
    return client.hget(key, field);
  }

  /**
   * Set a single field in a Redis hash.
   *
   * @param clientName - Connection name.
   * @param key - Hash key.
   * @param field - Field name within the hash.
   * @param value - Value to store.
   * @returns `1` if the field is new, `0` if it was updated.
   */
  async hset(
    clientName: string,
    key: string,
    field: string,
    value: string,
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.hset(key, field, value);
  }

  /**
   * Get all fields and values from a Redis hash.
   *
   * @param clientName - Connection name.
   * @param key - Hash key.
   * @returns Object mapping field names to their string values.
   */
  async hgetall(
    clientName: string,
    key: string,
  ): Promise<Record<string, string>> {
    const client = this.getClient(clientName);
    return client.hgetall(key);
  }

  /**
   * Delete one or more fields from a Redis hash.
   *
   * @param clientName - Connection name.
   * @param key - Hash key.
   * @param fields - Field name(s) to remove.
   * @returns Number of fields that were removed.
   */
  async hdel(
    clientName: string,
    key: string,
    ...fields: string[]
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.hdel(key, ...fields);
  }

  /**
   * Prepend one or more values to a Redis list (left push).
   *
   * @param clientName - Connection name.
   * @param key - List key.
   * @param values - Value(s) to prepend.
   * @returns The length of the list after the push.
   */
  async lpush(
    clientName: string,
    key: string,
    ...values: string[]
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.lpush(key, ...values);
  }

  /**
   * Append one or more values to a Redis list (right push).
   *
   * @param clientName - Connection name.
   * @param key - List key.
   * @param values - Value(s) to append.
   * @returns The length of the list after the push.
   */
  async rpush(
    clientName: string,
    key: string,
    ...values: string[]
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.rpush(key, ...values);
  }

  /**
   * Remove and return the first element of a list.
   *
   * @param clientName - Connection name.
   * @param key - List key.
   * @returns The popped element, or `null` if the list is empty.
   */
  async lpop(clientName: string, key: string): Promise<string | null> {
    const client = this.getClient(clientName);
    return client.lpop(key);
  }

  /**
   * Remove and return the last element of a list.
   *
   * @param clientName - Connection name.
   * @param key - List key.
   * @returns The popped element, or `null` if the list is empty.
   */
  async rpop(clientName: string, key: string): Promise<string | null> {
    const client = this.getClient(clientName);
    return client.rpop(key);
  }

  /**
   * Get a range of elements from a list.
   *
   * @param clientName - Connection name.
   * @param key - List key.
   * @param start - Start index (0-based, default `0`).
   * @param stop - Stop index (inclusive, default `-1` for end of list).
   * @returns Array of elements in the specified range.
   */
  async lrange(
    clientName: string,
    key: string,
    start = 0,
    stop = -1,
  ): Promise<string[]> {
    const client = this.getClient(clientName);
    return client.lrange(key, start, stop);
  }

  /**
   * Get the length of a list.
   *
   * @param clientName - Connection name.
   * @param key - List key.
   * @returns Number of elements in the list.
   */
  async llen(clientName: string, key: string): Promise<number> {
    const client = this.getClient(clientName);
    return client.llen(key);
  }

  /**
   * Add one or more members to a Redis set.
   *
   * @param clientName - Connection name.
   * @param key - Set key.
   * @param members - Member(s) to add.
   * @returns Number of members that were added (excludes already existing).
   */
  async sadd(
    clientName: string,
    key: string,
    ...members: string[]
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.sadd(key, ...members);
  }

  /**
   * Remove one or more members from a Redis set.
   *
   * @param clientName - Connection name.
   * @param key - Set key.
   * @param members - Member(s) to remove.
   * @returns Number of members that were removed.
   */
  async srem(
    clientName: string,
    key: string,
    ...members: string[]
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.srem(key, ...members);
  }

  /**
   * Get all members of a Redis set.
   *
   * @param clientName - Connection name.
   * @param key - Set key.
   * @returns Array of all set members.
   */
  async smembers(clientName: string, key: string): Promise<string[]> {
    const client = this.getClient(clientName);
    return client.smembers(key);
  }

  /**
   * Check if a value is a member of a set.
   *
   * @param clientName - Connection name.
   * @param key - Set key.
   * @param member - Member to check.
   * @returns `1` if member exists, `0` otherwise.
   */
  async sismember(
    clientName: string,
    key: string,
    member: string,
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.sismember(key, member);
  }

  /**
   * Get the cardinality (number of members) of a set.
   *
   * @param clientName - Connection name.
   * @param key - Set key.
   * @returns Number of members in the set.
   */
  async scard(clientName: string, key: string): Promise<number> {
    const client = this.getClient(clientName);
    return client.scard(key);
  }

  /**
   * Add one or more members to a sorted set with scores.
   *
   * @param clientName - Connection name.
   * @param key - Sorted set key.
   * @param args - Alternating score-member pairs (e.g. `1, 'a', 2, 'b'`).
   * @returns Number of elements added (excludes score updates).
   */
  async zadd(
    clientName: string,
    key: string,
    ...args: (string | number)[]
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.zadd(key, ...(args as any));
  }

  /**
   * Remove one or more members from a sorted set.
   *
   * @param clientName - Connection name.
   * @param key - Sorted set key.
   * @param members - Member(s) to remove.
   * @returns Number of members removed.
   */
  async zrem(
    clientName: string,
    key: string,
    ...members: string[]
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.zrem(key, ...members);
  }

  /**
   * Get members of a sorted set by rank range (ascending score).
   *
   * @param clientName - Connection name.
   * @param key - Sorted set key.
   * @param start - Start rank (0-based).
   * @param stop - Stop rank (inclusive).
   * @param withScores - If `true`, returns alternating member-score pairs.
   * @returns Array of members (optionally with interleaved scores).
   */
  async zrange(
    clientName: string,
    key: string,
    start: number,
    stop: number,
    withScores?: boolean,
  ): Promise<string[]> {
    const client = this.getClient(clientName);
    if (withScores) {
      return client.zrange(key, start, stop, 'WITHSCORES');
    }
    return client.zrange(key, start, stop);
  }

  /**
   * Get members of a sorted set by rank range (descending score).
   *
   * @param clientName - Connection name.
   * @param key - Sorted set key.
   * @param start - Start rank (0-based, highest score first).
   * @param stop - Stop rank (inclusive).
   * @param withScores - If `true`, returns alternating member-score pairs.
   * @returns Array of members (optionally with interleaved scores).
   */
  async zrevrange(
    clientName: string,
    key: string,
    start: number,
    stop: number,
    withScores?: boolean,
  ): Promise<string[]> {
    const client = this.getClient(clientName);
    if (withScores) {
      return client.zrevrange(key, start, stop, 'WITHSCORES');
    }
    return client.zrevrange(key, start, stop);
  }

  /**
   * Get the cardinality (number of members) of a sorted set.
   *
   * @param clientName - Connection name.
   * @param key - Sorted set key.
   * @returns Number of members in the sorted set.
   */
  async zcard(clientName: string, key: string): Promise<number> {
    const client = this.getClient(clientName);
    return client.zcard(key);
  }

  /**
   * Get the score of a member in a sorted set.
   *
   * @param clientName - Connection name.
   * @param key - Sorted set key.
   * @param member - The member whose score to look up.
   * @returns The score as a string, or `null` if the member doesn't exist.
   */
  async zscore(
    clientName: string,
    key: string,
    member: string,
  ): Promise<string | null> {
    const client = this.getClient(clientName);
    return client.zscore(key, member);
  }

  /**
   * Publish a message to a Redis channel.
   *
   * @param clientName - Connection name.
   * @param channel - Channel to publish to.
   * @param message - Message payload (string).
   * @returns Number of clients that received the message.
   */
  async publish(
    clientName: string,
    channel: string,
    message: string,
  ): Promise<number> {
    const publisher = this.getPublisher(clientName);
    return publisher.publish(channel, message);
  }

  /**
   * Subscribe to one or more Redis channels.
   *
   * Uses the dedicated subscriber client so that the main client
   * remains available for regular commands.
   *
   * @param clientName - Connection name.
   * @param channels - Channel name(s) to subscribe to.
   * @param callback - Function invoked for each received message.
   */
  async subscribe(
    clientName: string,
    channels: string | string[],
    callback: (channel: string, message: string) => void,
  ): Promise<void> {
    const subscriber = this.getSubscriber(clientName);

    subscriber.on('message', callback);

    if (Array.isArray(channels)) {
      await subscriber.subscribe(...channels);
    } else {
      await subscriber.subscribe(channels);
    }
  }

  /**
   * Unsubscribe from one or more Redis channels.
   *
   * If no channels are specified, unsubscribes from **all** channels.
   *
   * @param clientName - Connection name.
   * @param channels - Optional channel name(s) to unsubscribe from.
   */
  async unsubscribe(
    clientName: string,
    channels?: string | string[],
  ): Promise<void> {
    const subscriber = this.getSubscriber(clientName);

    if (channels) {
      if (Array.isArray(channels)) {
        await subscriber.unsubscribe(...channels);
      } else {
        await subscriber.unsubscribe(channels);
      }
    } else {
      await subscriber.unsubscribe();
    }
  }

  /**
   * Execute a pipelined transaction (MULTI/EXEC).
   *
   * All operations are batched into a single pipeline and executed
   * atomically. If any operation fails, its error is thrown.
   *
   * @param clientName - Connection name.
   * @param operations - Array of async functions to execute in the pipeline.
   * @returns Array of results from each operation.
   * @throws Error from the first failing pipeline command.
   */
  async transaction(
    clientName: string,
    operations: Array<() => Promise<any>>,
  ): Promise<any[]> {
    const client = this.getClient(clientName);
    const pipeline = client.pipeline();

    for (const operation of operations) {
      await operation.call(pipeline);
    }

    const results = await pipeline.exec();
    return results
      ? results.map(([err, result]) => {
          if (err) throw err;
          return result;
        })
      : [];
  }

  /**
   * Acquire a distributed lock using `SET NX PX`.
   *
   * Retries up to `retries` times with a configurable delay between
   * attempts. Returns a unique lock value that **must** be passed to
   * {@link releaseLock} to safely release the lock.
   *
   * @param clientName - Connection name.
   * @param lockKey - Key to use as the lock identifier.
   * @param ttl - Lock expiry in **seconds** (default `30`).
   * @param retries - Maximum number of acquire attempts (default `10`).
   * @param retryDelay - Milliseconds between attempts (default `100`).
   * @returns A unique lock value on success, or `null` if the lock could not be acquired.
   *
   * @example
   * ```typescript
   * const lockVal = await redis.acquireLock('cache', 'my-lock', 60);
   * if (lockVal) {
   *   try { /* critical section *\/ } finally {
   *     await redis.releaseLock('cache', 'my-lock', lockVal);
   *   }
   * }
   * ```
   */
  async acquireLock(
    clientName: string,
    lockKey: string,
    ttl = 30,
    retries = 10,
    retryDelay = 100,
  ): Promise<string | null> {
    const client = this.getClient(clientName);
    const lockValue = `${Date.now()}_${Math.random()}`;

    for (let i = 0; i < retries; i++) {
      const result = await client.set(
        lockKey,
        lockValue,
        'PX',
        ttl * 1000,
        'NX',
      );

      if (result === 'OK') {
        return lockValue;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    return null;
  }

  /**
   * Release a distributed lock atomically using a Lua script.
   *
   * Only releases the lock if the stored value matches `lockValue`,
   * preventing one client from releasing another's lock.
   *
   * @param clientName - Connection name.
   * @param lockKey - Key used as the lock identifier.
   * @param lockValue - The value returned by {@link acquireLock}.
   * @returns `true` if the lock was released, `false` if it was already gone or owned by another.
   */
  async releaseLock(
    clientName: string,
    lockKey: string,
    lockValue: string,
  ): Promise<boolean> {
    const client = this.getClient(clientName);

    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = (await client.eval(script, 1, lockKey, lockValue)) as number;
    return result === 1;
  }

  /**
   * Gracefully close all Redis connections (clients, subscribers, publishers).
   *
   * Sends `QUIT` to each client and clears the internal maps.
   */
  async closeAll(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    for (const [name, client] of this.clients) {
      closePromises.push(
        client
          .quit()
          .then(() => {
            this.logger.log(`Redis client '${name}' closed`);
          })
          .catch((error) => {
            this.logger.error(`Error closing Redis client '${name}'`, error);
          }),
      );
    }

    for (const [name, subscriber] of this.subscribers) {
      closePromises.push(
        subscriber
          .quit()
          .then(() => {
            this.logger.log(`Redis subscriber '${name}' closed`);
          })
          .catch((error) => {
            this.logger.error(
              `Error closing Redis subscriber '${name}'`,
              error,
            );
          }),
      );
    }

    for (const [name, publisher] of this.publishers) {
      closePromises.push(
        publisher
          .quit()
          .then(() => {
            this.logger.log(`Redis publisher '${name}' closed`);
          })
          .catch((error) => {
            this.logger.error(`Error closing Redis publisher '${name}'`, error);
          }),
      );
    }

    await Promise.all(closePromises);

    this.clients.clear();
    this.subscribers.clear();
    this.publishers.clear();
  }

  /**
   * NestJS lifecycle hook — close all connections on module teardown.
   */
  async onModuleDestroy(): Promise<void> {
    await this.closeAll();
  }
}
