/**
 * @fileoverview Database health monitoring and recovery service
 * @module database/services
 * @description Periodically checks the health of every registered database
 * connection (PostgreSQL, MongoDB, Redis), records results in a bounded
 * history, calculates uptime and latency statistics, and provides a
 * recovery mechanism for unhealthy connections.
 *
 * @author Outhan Chazima
 * @version 1.0.0
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  HealthCheckResult,
  ConnectionMetrics,
  DatabaseConnection,
} from '../interfaces/database.interface';
import { ConnectionManagerService } from './connection-manager.service';
import { PostgresService } from './postgres.service';
import { MongoService } from './mongo.service';
import { RedisService } from './redis.service';

/**
 * Configuration for periodic health checks.
 * @interface HealthCheckConfig
 */
interface HealthCheckConfig {
  /** Interval between health checks in milliseconds (default 30 000) */
  interval: number;
  /** Timeout per individual connection check in milliseconds (default 5 000) */
  timeout: number;
  /** Number of retry attempts before declaring a connection unhealthy */
  retries: number;
}

/**
 * Service for monitoring database connection health and attempting recovery.
 *
 * @class DatabaseHealthService
 * @implements {OnModuleDestroy}
 * @description Runs periodic health checks across all registered connections,
 * stores historical results for uptime/latency reporting, and exposes a
 * recovery API that can be triggered manually or by automated alerting.
 *
 * @example
 * ```typescript
 * await healthService.startMonitoring({ interval: 15000 });
 * const report = healthService.exportHealthReport();
 * const recovered = await healthService.attemptRecovery('main', 'postgres');
 * ```
 */
@Injectable()
export class DatabaseHealthService implements OnModuleDestroy {
  /** Logger scoped to this service */
  private readonly logger = new Logger(DatabaseHealthService.name);

  /** Handle for the periodic health-check interval */
  private healthCheckInterval: NodeJS.Timeout | null = null;

  /** Map of key (e.g. `'overall'`) → bounded array of health-check results */
  private readonly healthHistory: Map<string, HealthCheckResult[]> = new Map();

  /** Maximum number of results kept per history key */
  private readonly maxHistorySize = 100;

  /** Active health-check configuration */
  private readonly config: HealthCheckConfig = {
    interval: 30000, // 30 seconds
    timeout: 5000, // 5 seconds
    retries: 3,
  };

  /**
   * Creates an instance of DatabaseHealthService.
   *
   * @param connectionManager - Central connection registry.
   * @param postgresService - PostgreSQL service for health pings.
   * @param mongoService - MongoDB service for health pings.
   * @param redisService - Redis service for health pings.
   */
  constructor(
    private readonly connectionManager: ConnectionManagerService,
    private readonly postgresService: PostgresService,
    private readonly mongoService: MongoService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * NestJS lifecycle hook — stops monitoring on module teardown.
   */
  async onModuleDestroy(): Promise<void> {
    await this.stopMonitoring();
  }

  /**
   * Start periodic health monitoring.
   *
   * Performs an immediate health check, then schedules recurring checks
   * at the configured interval. Idempotent — calling when already running
   * logs a warning and returns.
   *
   * @param config - Optional partial overrides for the default config.
   */
  async startMonitoring(config?: Partial<HealthCheckConfig>): Promise<void> {
    if (this.healthCheckInterval) {
      this.logger.warn('Health monitoring is already running');
      return;
    }

    if (config) {
      Object.assign(this.config, config);
    }

    this.logger.log('Starting database health monitoring');

    // Perform initial health check
    await this.checkHealth();

    // Start periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        this.logger.error('Health check failed', error);
      }
    }, this.config.interval);
  }

  /**
   * Stop periodic health monitoring and clear the interval.
   */
  async stopMonitoring(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.logger.log('Database health monitoring stopped');
    }
  }

  /**
   * Perform a health check on **all** registered connections.
   *
   * Checks run in parallel. The overall status is derived from individual
   * results via {@link determineOverallStatus}. The result is stored in
   * history under the key `'overall'`.
   *
   * @returns A {@link HealthCheckResult} containing per-connection statuses.
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const connections = this.connectionManager.getAllConnections();
    const healthChecks = await Promise.all(
      connections.map((conn) => this.checkConnectionHealth(conn)),
    );

    const overallStatus = this.determineOverallStatus(healthChecks);

    const result: HealthCheckResult = {
      status: overallStatus,
      connections: healthChecks,
      timestamp: new Date(),
    };

    // Store in history
    this.addToHistory('overall', result);

    // Log if status is not healthy
    if (overallStatus !== 'healthy') {
      this.logger.warn(`Database health check: ${overallStatus}`, {
        unhealthyConnections: healthChecks.filter(
          (c) => c.status !== 'connected',
        ),
      });
    }

    const totalTime = Date.now() - startTime;
    this.logger.debug(`Health check completed in ${totalTime}ms`);

    return result;
  }

  /**
   * Check the health of a single database connection.
   *
   * Dispatches to the appropriate type-specific check method and measures
   * latency. Returns a structured result including status and optional error.
   *
   * @param connection - The connection to check.
   * @returns Per-connection health status with latency and metrics.
   */
  private async checkConnectionHealth(connection: DatabaseConnection): Promise<{
    name: string;
    type: string;
    status: 'connected' | 'disconnected' | 'error';
    latency?: number;
    error?: string;
    metrics?: ConnectionMetrics;
  }> {
    const startTime = Date.now();

    try {
      let isHealthy = false;
      let latency = 0;

      switch (connection.type) {
        case 'postgres':
          isHealthy = await this.checkPostgresHealth(connection.name);
          break;
        case 'mongodb':
          isHealthy = await this.checkMongoHealth(connection.name);
          break;
        case 'redis':
          isHealthy = await this.checkRedisHealth(connection.name);
          break;
      }

      latency = Date.now() - startTime;

      return {
        name: connection.name,
        type: connection.type,
        status: isHealthy ? 'connected' : 'disconnected',
        latency,
        metrics: connection.metrics,
      };
    } catch (error: unknown) {
      return {
        name: connection.name,
        type: connection.type,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Check PostgreSQL health by executing `SELECT 1` with a timeout.
   *
   * @param name - Connection name.
   * @returns `true` if the query completes within the timeout.
   */
  private async checkPostgresHealth(name: string): Promise<boolean> {
    try {
      const connection = this.postgresService.getConnection(name);
      if (!connection || !connection.isInitialized) {
        return false;
      }

      // Execute a simple query with timeout
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(
          () => reject(new Error('Health check timeout')),
          this.config.timeout,
        );
      });

      const queryPromise = connection.query('SELECT 1').then(() => true);

      return await Promise.race([queryPromise, timeoutPromise]);
    } catch (error) {
      this.logger.error(`PostgreSQL health check failed for '${name}'`, error);
      return false;
    }
  }

  /**
   * Check MongoDB health by issuing an admin `ping` with a timeout.
   *
   * @param name - Connection name.
   * @returns `true` if the ping succeeds within the timeout.
   */
  private async checkMongoHealth(name: string): Promise<boolean> {
    try {
      const connection = this.mongoService.getConnection(name);
      if (!connection || connection.readyState !== 1) {
        return false;
      }

      // Execute a ping command with timeout
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(
          () => reject(new Error('Health check timeout')),
          this.config.timeout,
        );
      });

      const pingPromise = connection
        .db!.admin()
        .ping()
        .then(() => true);

      return await Promise.race([pingPromise, timeoutPromise]);
    } catch (error) {
      this.logger.error(`MongoDB health check failed for '${name}'`, error);
      return false;
    }
  }

  /**
   * Check Redis health by issuing a `PING` command with a timeout.
   *
   * @param name - Connection name.
   * @returns `true` if the response is `'PONG'` within the timeout.
   */
  private async checkRedisHealth(name: string): Promise<boolean> {
    try {
      const client = this.redisService.getClient(name);
      if (!client || client.status !== 'ready') {
        return false;
      }

      // Execute a ping command with timeout
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(
          () => reject(new Error('Health check timeout')),
          this.config.timeout,
        );
      });

      const pingPromise = client.ping().then((result) => result === 'PONG');

      return await Promise.race([pingPromise, timeoutPromise]);
    } catch (error) {
      this.logger.error(`Redis health check failed for '${name}'`, error);
      return false;
    }
  }

  /**
   * Derive an overall health status from individual connection results.
   *
   * - `'healthy'` — all connections are connected
   * - `'unhealthy'` — no connections are connected or all errored
   * - `'degraded'` — some but not all connections are connected
   *
   * @param connections - Array of per-connection statuses.
   * @returns The aggregate health status.
   */
  private determineOverallStatus(
    connections: Array<{ status: 'connected' | 'disconnected' | 'error' }>,
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const total = connections.length;
    const connected = connections.filter(
      (c) => c.status === 'connected',
    ).length;
    const errors = connections.filter((c) => c.status === 'error').length;

    if (connected === total) {
      return 'healthy';
    } else if (errors === total || connected === 0) {
      return 'unhealthy';
    } else {
      return 'degraded';
    }
  }

  /**
   * Append a health-check result to the bounded history for a given key.
   *
   * @param key - History key (e.g. `'overall'`).
   * @param result - The health-check result to store.
   */
  private addToHistory(key: string, result: HealthCheckResult): void {
    const history = this.healthHistory.get(key) || [];
    history.push(result);

    // Maintain history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.healthHistory.set(key, history);
  }

  /**
   * Retrieve recent health-check history.
   *
   * @param key - History key (default `'overall'`).
   * @param limit - Maximum number of entries to return (default `10`).
   * @returns Array of the most recent {@link HealthCheckResult} entries.
   */
  getHealthHistory(key = 'overall', limit = 10): HealthCheckResult[] {
    const history = this.healthHistory.get(key) || [];
    return history.slice(-limit);
  }

  /**
   * Calculate aggregate health statistics from history.
   *
   * @param key - History key (default `'overall'`).
   * @returns Statistics including total checks, healthy/degraded/unhealthy
   *   counts, average latency, and uptime percentage.
   */
  getHealthStatistics(key = 'overall'): {
    totalChecks: number;
    healthyChecks: number;
    degradedChecks: number;
    unhealthyChecks: number;
    averageLatency: number;
    uptime: number;
  } {
    const history = this.healthHistory.get(key) || [];

    if (history.length === 0) {
      return {
        totalChecks: 0,
        healthyChecks: 0,
        degradedChecks: 0,
        unhealthyChecks: 0,
        averageLatency: 0,
        uptime: 0,
      };
    }

    const stats = {
      totalChecks: history.length,
      healthyChecks: history.filter((h) => h.status === 'healthy').length,
      degradedChecks: history.filter((h) => h.status === 'degraded').length,
      unhealthyChecks: history.filter((h) => h.status === 'unhealthy').length,
      averageLatency: 0,
      uptime: 0,
    };

    // Calculate average latency
    const totalLatency = history.reduce((sum, h) => {
      const avgConnLatency =
        h.connections.reduce((s, c) => s + (c.latency || 0), 0) /
        h.connections.length;
      return sum + avgConnLatency;
    }, 0);
    stats.averageLatency = totalLatency / history.length;

    // Calculate uptime percentage
    stats.uptime = (stats.healthyChecks / stats.totalChecks) * 100;

    return stats;
  }

  /**
   * Get health statistics for a specific named connection.
   *
   * @param connectionName - The connection name.
   * @param connectionType - The database type.
   * @returns Per-connection health info including current status, average
   *   latency, uptime percentage, and recent error messages.
   */
  getConnectionHealthStats(
    connectionName: string,
    connectionType: string,
  ): {
    isHealthy: boolean;
    lastCheck?: Date;
    averageLatency: number;
    uptime: number;
    recentErrors: string[];
  } {
    const history = this.healthHistory.get('overall') || [];

    const connectionHistory = history
      .map((h) =>
        h.connections.find(
          (c) => c.name === connectionName && c.type === connectionType,
        ),
      )
      .filter((c): c is NonNullable<typeof c> => c !== undefined && c !== null);

    if (connectionHistory.length === 0) {
      return {
        isHealthy: false,
        averageLatency: 0,
        uptime: 0,
        recentErrors: [],
      };
    }

    const latest = connectionHistory[connectionHistory.length - 1];
    const connected = connectionHistory.filter(
      (c) => c.status === 'connected',
    ).length;
    const totalLatency = connectionHistory.reduce(
      (sum, c) => sum + (c.latency || 0),
      0,
    );
    const errors = connectionHistory
      .filter((c) => c.error)
      .map((c) => c.error!)
      .slice(-5);

    return {
      isHealthy: latest.status === 'connected',
      lastCheck: history[history.length - 1]?.timestamp,
      averageLatency: totalLatency / connectionHistory.length,
      uptime: (connected / connectionHistory.length) * 100,
      recentErrors: errors,
    };
  }

  /**
   * Attempt to recover an unhealthy connection.
   *
   * Executes a lightweight operation on the connection to trigger
   * internal reconnection logic (e.g. TypeORM auto-reconnect, Mongoose
   * reconnect, or ioredis auto-reconnect).
   *
   * @param connectionName - The connection name.
   * @param connectionType - The database type.
   * @returns `true` if the recovery probe succeeded.
   */
  async attemptRecovery(
    connectionName: string,
    connectionType: string,
  ): Promise<boolean> {
    this.logger.log(
      `Attempting recovery for ${connectionType}:${connectionName}`,
    );

    try {
      switch (connectionType) {
        case 'postgres':
          // PostgreSQL connections are managed by TypeORM
          // We can try to execute a simple query to trigger reconnection
          await this.postgresService.executeRawQuery(
            connectionName,
            'SELECT 1',
            [],
          );
          break;
        case 'mongodb': {
          // MongoDB connections are managed by Mongoose
          // We can try to execute a simple operation to trigger reconnection
          const mongoConn = this.mongoService.getConnection(connectionName);
          await mongoConn.db!.admin().ping();
          break;
        }
        case 'redis': {
          // Redis client will auto-reconnect
          // We can try to ping to verify
          const redisClient = this.redisService.getClient(connectionName);
          await redisClient.ping();
          break;
        }
      }

      this.logger.log(
        `Recovery successful for ${connectionType}:${connectionName}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Recovery failed for ${connectionType}:${connectionName}`,
        error,
      );
      return false;
    }
  }

  /**
   * Export a comprehensive health report.
   *
   * Includes the most recent overall status, aggregate statistics, and
   * per-connection health stats suitable for dashboards or alerting.
   *
   * @returns A structured health report.
   */
  exportHealthReport(): {
    timestamp: Date;
    currentStatus: HealthCheckResult;
    statistics: ReturnType<DatabaseHealthService['getHealthStatistics']>;
    connectionStats: Array<{
      name: string;
      type: string;
      stats: ReturnType<DatabaseHealthService['getConnectionHealthStats']>;
    }>;
  } {
    const currentStatus =
      this.healthHistory.get('overall')?.[
        this.healthHistory.get('overall')!.length - 1
      ];
    const overallStats = this.getHealthStatistics();

    const connections = this.connectionManager.getAllConnections();
    const connectionStats = connections.map((conn) => ({
      name: conn.name,
      type: conn.type,
      stats: this.getConnectionHealthStats(conn.name, conn.type),
    }));

    return {
      timestamp: new Date(),
      currentStatus: currentStatus || {
        status: 'unhealthy',
        connections: [],
        timestamp: new Date(),
      },
      statistics: overallStats,
      connectionStats,
    };
  }
}
