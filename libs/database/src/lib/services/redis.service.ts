import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as Redis from 'ioredis';
import {
  RedisConnectionConfig,
  CacheOptions,
} from '../interfaces/database.interface';
import { ConnectionManagerService } from './connection-manager.service';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly clients: Map<string, Redis.Redis> = new Map();
  private readonly subscribers: Map<string, Redis.Redis> = new Map();
  private readonly publishers: Map<string, Redis.Redis> = new Map();

  private readonly configs: Array<{
    name: string;
    config: RedisConnectionConfig;
  }> = [];

  constructor(private readonly connectionManager: ConnectionManagerService) {}

  async initialize(): Promise<void> {
    for (const { name, config } of this.configs) {
      try {
        await this.createConnection(name, config);
        this.logger.log(`Redis connection '${name}' established successfully`);
      } catch (error) {
        this.logger.error(
          `Failed to establish Redis connection '${name}'`,
          error
        );
        throw error;
      }
    }
  }

  /**
   * Create a Redis connection
   */
  private async createConnection(
    name: string,
    config: RedisConnectionConfig
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
      tls: config.tls,
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
   * Get a Redis client by name
   */
  getClient(name: string): Redis.Redis {
    const client = this.clients.get(name);
    if (!client) {
      throw new Error(`Redis client '${name}' not found`);
    }
    return client;
  }

  /**
   * Get a subscriber client
   */
  getSubscriber(name: string): Redis.Redis {
    const subscriber = this.subscribers.get(name);
    if (!subscriber) {
      throw new Error(`Redis subscriber '${name}' not found`);
    }
    return subscriber;
  }

  /**
   * Get a publisher client
   */
  getPublisher(name: string): Redis.Redis {
    const publisher = this.publishers.get(name);
    if (!publisher) {
      throw new Error(`Redis publisher '${name}' not found`);
    }
    return publisher;
  }

  /**
   * Cache get operation
   */
  async get<T = any>(
    clientName: string,
    key: string,
    options?: CacheOptions
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
   * Cache set operation
   */
  async set<T = any>(
    clientName: string,
    key: string,
    value: T,
    options?: CacheOptions
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
   * Cache delete operation
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
   * Cache exists operation
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
   * Get multiple keys
   */
  async mget<T = any>(
    clientName: string,
    keys: string[]
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
   * Set multiple keys
   */
  async mset<T = any>(
    clientName: string,
    items: Array<{ key: string; value: T; ttl?: number }>
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
   * Increment a counter
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
   * Decrement a counter
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
   * Set expiration on a key
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
   * Get TTL of a key
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
   * Clear cache by pattern
   */
  async clearCache(pattern?: string): Promise<void> {
    for (const [name, client] of this.clients) {
      try {
        if (pattern) {
          const keys = await client.keys(pattern);
          if (keys.length > 0) {
            await client.del(...keys);
            this.logger.log(
              `Cleared ${keys.length} keys matching pattern '${pattern}' from '${name}'`
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
   * Hash operations
   */
  async hget(
    clientName: string,
    key: string,
    field: string
  ): Promise<string | null> {
    const client = this.getClient(clientName);
    return client.hget(key, field);
  }

  async hset(
    clientName: string,
    key: string,
    field: string,
    value: string
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.hset(key, field, value);
  }

  async hgetall(
    clientName: string,
    key: string
  ): Promise<Record<string, string>> {
    const client = this.getClient(clientName);
    return client.hgetall(key);
  }

  async hdel(
    clientName: string,
    key: string,
    ...fields: string[]
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.hdel(key, ...fields);
  }

  /**
   * List operations
   */
  async lpush(
    clientName: string,
    key: string,
    ...values: string[]
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.lpush(key, ...values);
  }

  async rpush(
    clientName: string,
    key: string,
    ...values: string[]
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.rpush(key, ...values);
  }

  async lpop(clientName: string, key: string): Promise<string | null> {
    const client = this.getClient(clientName);
    return client.lpop(key);
  }

  async rpop(clientName: string, key: string): Promise<string | null> {
    const client = this.getClient(clientName);
    return client.rpop(key);
  }

  async lrange(
    clientName: string,
    key: string,
    start = 0,
    stop = -1
  ): Promise<string[]> {
    const client = this.getClient(clientName);
    return client.lrange(key, start, stop);
  }

  async llen(clientName: string, key: string): Promise<number> {
    const client = this.getClient(clientName);
    return client.llen(key);
  }

  /**
   * Set operations
   */
  async sadd(
    clientName: string,
    key: string,
    ...members: string[]
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.sadd(key, ...members);
  }

  async srem(
    clientName: string,
    key: string,
    ...members: string[]
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.srem(key, ...members);
  }

  async smembers(clientName: string, key: string): Promise<string[]> {
    const client = this.getClient(clientName);
    return client.smembers(key);
  }

  async sismember(
    clientName: string,
    key: string,
    member: string
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.sismember(key, member);
  }

  async scard(clientName: string, key: string): Promise<number> {
    const client = this.getClient(clientName);
    return client.scard(key);
  }

  /**
   * Sorted set operations
   */
  async zadd(
    clientName: string,
    key: string,
    ...args: (string | number)[]
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.zadd(key, ...(args as any));
  }

  async zrem(
    clientName: string,
    key: string,
    ...members: string[]
  ): Promise<number> {
    const client = this.getClient(clientName);
    return client.zrem(key, ...members);
  }

  async zrange(
    clientName: string,
    key: string,
    start: number,
    stop: number,
    withScores?: boolean
  ): Promise<string[]> {
    const client = this.getClient(clientName);
    if (withScores) {
      return client.zrange(key, start, stop, 'WITHSCORES');
    }
    return client.zrange(key, start, stop);
  }

  async zrevrange(
    clientName: string,
    key: string,
    start: number,
    stop: number,
    withScores?: boolean
  ): Promise<string[]> {
    const client = this.getClient(clientName);
    if (withScores) {
      return client.zrevrange(key, start, stop, 'WITHSCORES');
    }
    return client.zrevrange(key, start, stop);
  }

  async zcard(clientName: string, key: string): Promise<number> {
    const client = this.getClient(clientName);
    return client.zcard(key);
  }

  async zscore(
    clientName: string,
    key: string,
    member: string
  ): Promise<string | null> {
    const client = this.getClient(clientName);
    return client.zscore(key, member);
  }

  /**
   * Pub/Sub operations
   */
  async publish(
    clientName: string,
    channel: string,
    message: string
  ): Promise<number> {
    const publisher = this.getPublisher(clientName);
    return publisher.publish(channel, message);
  }

  async subscribe(
    clientName: string,
    channels: string | string[],
    callback: (channel: string, message: string) => void
  ): Promise<void> {
    const subscriber = this.getSubscriber(clientName);

    subscriber.on('message', callback);

    if (Array.isArray(channels)) {
      await subscriber.subscribe(...channels);
    } else {
      await subscriber.subscribe(channels);
    }
  }

  async unsubscribe(
    clientName: string,
    channels?: string | string[]
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
   * Transaction operations
   */
  async transaction(
    clientName: string,
    operations: Array<() => Promise<any>>
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
   * Lock operations for distributed locking
   */
  async acquireLock(
    clientName: string,
    lockKey: string,
    ttl = 30,
    retries = 10,
    retryDelay = 100
  ): Promise<string | null> {
    const client = this.getClient(clientName);
    const lockValue = `${Date.now()}_${Math.random()}`;

    for (let i = 0; i < retries; i++) {
      const result = await client.set(
        lockKey,
        lockValue,
        'PX',
        ttl * 1000,
        'NX'
      );

      if (result === 'OK') {
        return lockValue;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    return null;
  }

  async releaseLock(
    clientName: string,
    lockKey: string,
    lockValue: string
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
   * Close all connections
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
          })
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
              error
            );
          })
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
          })
      );
    }

    await Promise.all(closePromises);

    this.clients.clear();
    this.subscribers.clear();
    this.publishers.clear();
  }

  async onModuleDestroy(): Promise<void> {
    await this.closeAll();
  }
}
