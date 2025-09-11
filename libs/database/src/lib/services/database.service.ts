/**
 * @fileoverview Main database service orchestrator
 * @module database/services
 * @description Central service that coordinates all database operations across
 * PostgreSQL, MongoDB, and Redis connections. Manages initialization, health monitoring,
 * query routing, and distributed transactions.
 * @author Outhan Chazima
 * @version 1.0.0
 */

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
} from '@nestjs/common';
import { DATABASE_OPTIONS } from '../database.constants';
import {
  DatabaseModuleOptions,
  DatabaseConnection,
  HealthCheckResult,
} from '../interfaces/database.interface';
import { ConnectionManagerService } from './connection-manager.service';
import { PostgresService } from './postgres.service';
import { MongoService } from './mongo.service';
import { RedisService } from './redis.service';
import { DatabaseHealthService } from './database-health.service';
import { QueryOptimizationService } from './query-optimization.service';

/**
 * Main database service for managing all database connections and operations
 * @class DatabaseService
 * @implements {OnModuleInit}
 * @implements {OnModuleDestroy}
 * @description Provides a unified interface for interacting with multiple database types,
 * handles connection lifecycle, health monitoring, and query routing.
 *
 * @example
 * ```typescript
 * // Get a specific connection
 * const pgConnection = databaseService.getConnection('main', 'postgres');
 *
 * // Execute raw SQL
 * const results = await databaseService.executeSQL('main', 'SELECT * FROM users WHERE id = $1', [userId]);
 *
 * // Check health status
 * const health = await databaseService.checkHealth();
 * ```
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  /** Logger instance for service-level logging */
  private readonly logger = new Logger(DatabaseService.name);

  /** Flag to track initialization status */
  private initialized = false;

  /**
   * Creates an instance of DatabaseService
   * @param options - Database module configuration options
   * @param connectionManager - Service for managing database connections
   * @param postgresService - Service for PostgreSQL operations
   * @param mongoService - Service for MongoDB operations
   * @param redisService - Service for Redis operations
   * @param healthService - Service for health monitoring
   * @param optimizationService - Service for query optimization
   */
  constructor(
    @Inject(DATABASE_OPTIONS) private readonly options: DatabaseModuleOptions,
    private readonly connectionManager: ConnectionManagerService,
    private readonly postgresService: PostgresService,
    private readonly mongoService: MongoService,
    private readonly redisService: RedisService,
    private readonly healthService: DatabaseHealthService,
    private readonly optimizationService: QueryOptimizationService
  ) {}

  /**
   * NestJS lifecycle hook - Initialize database connections on module init
   * @returns Promise that resolves when all connections are established
   * @throws Error if any connection fails to initialize
   */
  async onModuleInit(): Promise<void> {
    // Prevent duplicate initialization
    if (this.initialized) {
      return;
    }

    this.logger.log('Initializing database connections...');

    try {
      // Initialize PostgreSQL connections
      if (this.options.postgres?.length) {
        await this.postgresService.initialize();
        this.logger.log(
          `Initialized ${this.options.postgres.length} PostgreSQL connection(s)`
        );
      }

      // Initialize MongoDB connections
      if (this.options.mongodb?.length) {
        await this.mongoService.initialize();
        this.logger.log(
          `Initialized ${this.options.mongodb.length} MongoDB connection(s)`
        );
      }

      // Initialize Redis connections
      if (this.options.redis?.length) {
        await this.redisService.initialize();
        this.logger.log(
          `Initialized ${this.options.redis.length} Redis connection(s)`
        );
      }

      // Start health monitoring if enabled
      if (this.options.enableHealthCheck) {
        await this.healthService.startMonitoring();
        this.logger.log('Database health monitoring started');
      }

      // Enable query optimization if configured
      if (this.options.enablePerformanceMonitoring) {
        this.optimizationService.enableMonitoring();
        this.logger.log('Query performance monitoring enabled');
      }

      this.initialized = true;
      this.logger.log('Database module initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database module', error);
      throw error;
    }
  }

  /**
   * NestJS lifecycle hook - Clean up database connections on module destroy
   * @returns Promise that resolves when all connections are closed
   * @throws Error if connections fail to close properly
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down database connections...');

    try {
      // Stop health monitoring
      if (this.options.enableHealthCheck) {
        await this.healthService.stopMonitoring();
      }

      // Close all connections gracefully
      await Promise.all([
        this.postgresService.closeAll(),
        this.mongoService.closeAll(),
        this.redisService.closeAll(),
      ]);

      this.initialized = false;
      this.logger.log('Database connections closed successfully');
    } catch (error) {
      this.logger.error('Error closing database connections', error);
      throw error;
    }
  }

  /**
   * Get a specific database connection by name and type
   * @param name - Connection name as defined in configuration
   * @param type - Database type ('postgres', 'mongodb', or 'redis')
   * @returns DatabaseConnection object or null if not found
   * @example
   * ```typescript
   * const connection = databaseService.getConnection('main', 'postgres');
   * if (connection && connection.isConnected) {
   *   // Use the connection
   * }
   * ```
   */
  getConnection(
    name: string,
    type: 'postgres' | 'mongodb' | 'redis'
  ): DatabaseConnection | null {
    return this.connectionManager.getConnection(name, type);
  }

  /**
   * Get all active database connections
   * @returns Array of all active DatabaseConnection objects
   * @example
   * ```typescript
   * const connections = databaseService.getAllConnections();
   * connections.forEach(conn => {
   *   console.log(`${conn.name}: ${conn.type} - ${conn.isConnected ? 'Connected' : 'Disconnected'}`);
   * });
   * ```
   */
  getAllConnections(): DatabaseConnection[] {
    return this.connectionManager.getAllConnections();
  }

  /**
   * Check health status of all database connections
   * @returns Promise resolving to HealthCheckResult with connection statuses
   * @example
   * ```typescript
   * const health = await databaseService.checkHealth();
   * if (health.status === 'unhealthy') {
   *   // Handle unhealthy connections
   * }
   * ```
   */
  async checkHealth(): Promise<HealthCheckResult> {
    return this.healthService.checkHealth();
  }

  /**
   * Get query performance statistics
   * @param connectionName - Optional connection name to filter statistics
   * @returns Performance statistics for the specified connection or all connections
   * @example
   * ```typescript
   * const stats = databaseService.getPerformanceStats('main');
   * console.log(`Average query time: ${stats.averageQueryTime}ms`);
   * ```
   */
  getPerformanceStats(connectionName?: string) {
    return this.optimizationService.getStatistics(connectionName);
  }

  /**
   * Clear Redis cache entries
   * @param pattern - Optional pattern to match keys for deletion (e.g., 'user:*')
   * @returns Promise that resolves when cache is cleared
   * @example
   * ```typescript
   * // Clear all cache
   * await databaseService.clearCache();
   *
   * // Clear specific pattern
   * await databaseService.clearCache('session:*');
   * ```
   */
  async clearCache(pattern?: string): Promise<void> {
    await this.redisService.clearCache(pattern);
  }

  /**
   * Execute a raw SQL query on PostgreSQL connection
   * @param connectionName - Name of the PostgreSQL connection to use
   * @param query - SQL query string with optional parameter placeholders
   * @param parameters - Optional array of query parameters
   * @returns Promise resolving to query results
   * @example
   * ```typescript
   * const users = await databaseService.executeSQL(
   *   'main',
   *   'SELECT * FROM users WHERE age > $1 AND status = $2',
   *   [18, 'active']
   * );
   * ```
   */
  async executeSQL<T = unknown>(
    connectionName: string,
    query: string,
    parameters?: unknown[]
  ): Promise<T> {
    return this.postgresService.executeRawQuery(
      connectionName,
      query,
      parameters
    );
  }

  /**
   * Execute a MongoDB aggregation pipeline
   * @param connectionName - Name of the MongoDB connection to use
   * @param collection - Collection name to run aggregation on
   * @param pipeline - MongoDB aggregation pipeline stages
   * @returns Promise resolving to aggregation results
   * @example
   * ```typescript
   * const results = await databaseService.executeAggregation(
   *   'main',
   *   'orders',
   *   [
   *     { $match: { status: 'completed' } },
   *     { $group: { _id: '$customerId', total: { $sum: '$amount' } } },
   *     { $sort: { total: -1 } }
   *   ]
   * );
   * ```
   */
  async executeAggregation<T = unknown>(
    connectionName: string,
    collection: string,
    pipeline: Record<string, unknown>[]
  ): Promise<T[]> {
    return this.mongoService.executeAggregation(
      connectionName,
      collection,
      pipeline
    );
  }

  /**
   * Get Redis client for direct operations
   * @param name - Name of the Redis connection
   * @returns Redis client instance for direct operations
   * @example
   * ```typescript
   * const redis = databaseService.getRedisClient('cache');
   * await redis.set('key', 'value', 'EX', 3600);
   * const value = await redis.get('key');
   * ```
   */
  getRedisClient(name: string) {
    return this.redisService.getClient(name);
  }

  /**
   * Route a query to the appropriate database based on configuration
   * @param routing - Routing configuration specifying database type and connection name
   * @param operation - Operation to execute (e.g., 'find', 'insert', 'update')
   * @param args - Additional arguments for the operation
   * @returns Promise resolving to operation results
   * @throws Error if connection not found or unsupported database type
   * @example
   * ```typescript
   * const result = await databaseService.routeQuery(
   *   { type: 'postgres', name: 'main' },
   *   'find',
   *   { table: 'users', where: { status: 'active' } }
   * );
   * ```
   */
  async routeQuery<T = unknown>(
    routing: { type: 'postgres' | 'mongodb'; name: string },
    operation: string,
    ...args: unknown[]
  ): Promise<T> {
    const connection = this.getConnection(routing.name, routing.type);

    if (!connection) {
      throw new Error(
        `Connection ${routing.name} of type ${routing.type} not found`
      );
    }

    switch (routing.type) {
      case 'postgres':
        return this.postgresService.executeOperation(
          routing.name,
          operation,
          ...args
        );
      case 'mongodb':
        return this.mongoService.executeOperation(
          routing.name,
          operation,
          ...args
        );
      default:
        throw new Error(`Unsupported database type: ${routing.type}`);
    }
  }

  /**
   * Begin a distributed transaction across multiple databases
   * @returns Promise resolving to transaction ID for tracking
   * @description Coordinates transactions across multiple database types to ensure
   * data consistency in distributed operations
   * @example
   * ```typescript
   * const txId = await databaseService.beginDistributedTransaction();
   * try {
   *   // Perform operations across databases
   *   await databaseService.commitDistributedTransaction(txId);
   * } catch (error) {
   *   await databaseService.rollbackDistributedTransaction(txId);
   * }
   * ```
   */
  async beginDistributedTransaction() {
    // Implementation for distributed transactions
    // This would coordinate transactions across multiple databases
    return this.connectionManager.beginDistributedTransaction();
  }

  /**
   * Commit a distributed transaction
   * @param transactionId - ID of the transaction to commit
   * @returns Promise that resolves when transaction is committed
   * @throws Error if transaction fails to commit
   */
  async commitDistributedTransaction(transactionId: string) {
    return this.connectionManager.commitDistributedTransaction(transactionId);
  }

  /**
   * Rollback a distributed transaction
   * @param transactionId - ID of the transaction to rollback
   * @returns Promise that resolves when transaction is rolled back
   * @description Reverts all changes made within the distributed transaction
   */
  async rollbackDistributedTransaction(transactionId: string) {
    return this.connectionManager.rollbackDistributedTransaction(transactionId);
  }
}
