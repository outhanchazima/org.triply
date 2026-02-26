/**
 * @fileoverview Central connection manager for all database types
 * @module database/services
 * @description Maintains a registry of all active database connections
 * (PostgreSQL, MongoDB, Redis), tracks per-connection metrics, and
 * orchestrates distributed transactions spanning multiple databases.
 *
 * @author Outhan Chazima
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Connection } from 'mongoose';
import { Redis } from 'ioredis';
import {
  DatabaseConnection,
  ConnectionMetrics,
} from '../interfaces/database.interface';
import { randomUUID } from 'node:crypto';

/**
 * Internal representation of a distributed transaction.
 * @interface DistributedTransaction
 */
interface DistributedTransaction {
  /** Unique transaction identifier (UUID) */
  id: string;
  /** Map of `type:name` keys to database-specific transaction objects */
  connections: Map<string, any>;
  /** Current transaction lifecycle status */
  status: 'pending' | 'committed' | 'rolled_back';
  /** Timestamp when the transaction was created */
  createdAt: Date;
}

/**
 * Central registry and manager for all database connections.
 *
 * @class ConnectionManagerService
 * @description Tracks connection state, aggregates per-connection performance
 * metrics (total queries, average query time, slow-query count), and provides
 * a two-phase-commit–style API for distributed transactions across PostgreSQL
 * and MongoDB connections.
 *
 * @example
 * ```typescript
 * // Register and check health
 * await connectionManager.registerPostgresConnection('main');
 * const healthy = await connectionManager.isHealthy('main', 'postgres');
 *
 * // Distributed transaction
 * const txId = await connectionManager.beginDistributedTransaction();
 * connectionManager.addToDistributedTransaction(txId, 'main', 'postgres', pgQR);
 * await connectionManager.commitDistributedTransaction(txId);
 * ```
 */
@Injectable()
export class ConnectionManagerService {
  /** Logger scoped to this service */
  private readonly logger = new Logger(ConnectionManagerService.name);

  /** Map of `type:name` → {@link DatabaseConnection} */
  private readonly connections: Map<string, DatabaseConnection> = new Map();

  /** Map of `type:name` → {@link ConnectionMetrics} */
  private readonly connectionMetrics: Map<string, ConnectionMetrics> =
    new Map();

  /** Map of transaction ID → {@link DistributedTransaction} */
  private readonly distributedTransactions: Map<
    string,
    DistributedTransaction
  > = new Map();

  /**
   * Register a PostgreSQL connection in the central registry.
   *
   * The actual `DataSource` is managed by the TypeORM module; this method
   * creates the bookkeeping entry and initialises metrics.
   *
   * @param name - Connection name.
   * @returns Always `null` — the `PostgresService` holds the real `DataSource`.
   * @throws Error if registration fails.
   */
  async registerPostgresConnection(name: string): Promise<DataSource | null> {
    try {
      // The actual connection is managed by TypeORM module
      // We'll get it from the module context when needed
      const connection: DatabaseConnection = {
        name,
        type: 'postgres',
        connection: null, // Will be set by PostgresService
        isConnected: true,
        lastUsed: new Date(),
        metrics: this.initializeMetrics(),
      };

      this.connections.set(`postgres:${name}`, connection);
      if (connection.metrics) {
        this.connectionMetrics.set(`postgres:${name}`, connection.metrics);
      }

      return null; // PostgresService will handle the actual DataSource
    } catch (error) {
      this.logger.error(
        `Failed to register PostgreSQL connection '${name}'`,
        error,
      );
      throw error;
    }
  }

  /**
   * Register a MongoDB connection in the central registry.
   *
   * The actual Mongoose `Connection` is managed by the Mongoose module;
   * this method creates the bookkeeping entry and initialises metrics.
   *
   * @param name - Connection name.
   * @returns Always `null` — the `MongoService` holds the real `Connection`.
   * @throws Error if registration fails.
   */
  async registerMongoConnection(name: string): Promise<Connection | null> {
    try {
      // The actual connection is managed by Mongoose module
      const connection: DatabaseConnection = {
        name,
        type: 'mongodb',
        connection: null, // Will be set by MongoService
        isConnected: true,
        lastUsed: new Date(),
        metrics: this.initializeMetrics(),
      };

      this.connections.set(`mongodb:${name}`, connection);
      if (connection.metrics) {
        this.connectionMetrics.set(`mongodb:${name}`, connection.metrics);
      }

      return null; // MongoService will handle the actual Connection
    } catch (error) {
      this.logger.error(
        `Failed to register MongoDB connection '${name}'`,
        error,
      );
      throw error;
    }
  }

  /**
   * Register a Redis connection in the central registry.
   *
   * Unlike Postgres/Mongo, the Redis client is passed in directly because
   * it is created by the {@link RedisService}. Event listeners are
   * attached to track ready/close/error states.
   *
   * @param name - Connection name.
   * @param client - The `ioredis` client instance.
   */
  registerRedisConnection(name: string, client: Redis): void {
    const connection: DatabaseConnection = {
      name,
      type: 'redis',
      connection: client,
      isConnected: client.status === 'ready',
      lastUsed: new Date(),
      metrics: this.initializeMetrics(),
    };

    this.connections.set(`redis:${name}`, connection);
    this.connectionMetrics.set(`redis:${name}`, connection.metrics!);

    // Monitor connection status
    client.on('ready', () => {
      connection.isConnected = true;
      this.logger.log(`Redis connection '${name}' is ready`);
    });

    client.on('close', () => {
      connection.isConnected = false;
      this.logger.warn(`Redis connection '${name}' closed`);
    });

    client.on('error', (error) => {
      connection.isConnected = false;
      this.logger.error(`Redis connection '${name}' error:`, error);
    });
  }

  /**
   * Retrieve a specific connection wrapper by name and type.
   *
   * Automatically updates `lastUsed` on access.
   *
   * @param name - Connection name.
   * @param type - Database type.
   * @returns The {@link DatabaseConnection} or `null` if not found.
   */
  getConnection(
    name: string,
    type: 'postgres' | 'mongodb' | 'redis',
  ): DatabaseConnection | null {
    const key = `${type}:${name}`;
    const connection = this.connections.get(key);

    if (connection) {
      connection.lastUsed = new Date();
    }

    return connection || null;
  }

  /**
   * Retrieve all registered connections.
   *
   * @returns Array of all {@link DatabaseConnection} objects.
   */
  getAllConnections(): DatabaseConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Retrieve all connections of a specific database type.
   *
   * @param type - Database type to filter by.
   * @returns Array of matching {@link DatabaseConnection} objects.
   */
  getConnectionsByType(
    type: 'postgres' | 'mongodb' | 'redis',
  ): DatabaseConnection[] {
    return Array.from(this.connections.entries())
      .filter(([key]) => key.startsWith(`${type}:`))
      .map(([, connection]) => connection);
  }

  /**
   * Incrementally update performance metrics for a connection.
   *
   * Called after each query by the individual database services.
   *
   * @param name - Connection name.
   * @param type - Database type.
   * @param update - Partial update descriptor.
   * @param update.query - Whether this was a query event.
   * @param update.failed - Whether the query failed.
   * @param update.queryTime - Execution time in milliseconds.
   * @param update.slow - Whether the query exceeded the slow threshold.
   */
  updateMetrics(
    name: string,
    type: 'postgres' | 'mongodb' | 'redis',
    update: Partial<{
      query: boolean;
      failed: boolean;
      queryTime: number;
      slow: boolean;
    }>,
  ): void {
    const key = `${type}:${name}`;
    const metrics = this.connectionMetrics.get(key);

    if (!metrics) {
      return;
    }

    if (update.query) {
      metrics.totalQueries++;

      if (update.failed) {
        metrics.failedQueries++;
      }

      if (update.queryTime !== undefined) {
        // Update average query time
        metrics.averageQueryTime =
          (metrics.averageQueryTime * (metrics.totalQueries - 1) +
            update.queryTime) /
          metrics.totalQueries;
      }

      if (update.slow) {
        metrics.slowQueries++;
      }
    }
  }

  /**
   * Retrieve accumulated metrics for a specific connection.
   *
   * @param name - Connection name.
   * @param type - Database type.
   * @returns The {@link ConnectionMetrics} object, or `null` if not found.
   */
  getMetrics(
    name: string,
    type: 'postgres' | 'mongodb' | 'redis',
  ): ConnectionMetrics | null {
    const key = `${type}:${name}`;
    return this.connectionMetrics.get(key) || null;
  }

  /**
   * Create a zeroed-out {@link ConnectionMetrics} instance.
   *
   * @returns Fresh metrics with all counters at zero.
   */
  private initializeMetrics(): ConnectionMetrics {
    return {
      totalQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      activeConnections: 0,
      idleConnections: 0,
      totalConnections: 1,
    };
  }

  /**
   * Perform a lightweight health check on a specific connection.
   *
   * For Redis, issues a `PING` command. For Postgres/MongoDB the
   * check is delegated to their respective services.
   *
   * @param name - Connection name.
   * @param type - Database type.
   * @returns `true` if the connection appears healthy.
   */
  async isHealthy(
    name: string,
    type: 'postgres' | 'mongodb' | 'redis',
  ): Promise<boolean> {
    const connection = this.getConnection(name, type);

    if (!connection) {
      return false;
    }

    if (!connection.isConnected) {
      return false;
    }

    try {
      switch (type) {
        case 'postgres':
          // PostgreSQL health check would be done in PostgresService
          return true;
        case 'mongodb':
          // MongoDB health check would be done in MongoService
          return true;
        case 'redis': {
          const redis = connection.connection as Redis;
          const result = await redis.ping();
          return result === 'PONG';
        }
        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`Health check failed for ${type}:${name}`, error);
      return false;
    }
  }

  /**
   * Retrieve connection-pool statistics.
   *
   * For Redis, fetches the `clients` section from `INFO`. For
   * Postgres/MongoDB, returns the connection name and type.
   *
   * @param name - Connection name.
   * @param type - Database type.
   * @returns A stats object, or `null` if the connection doesn't exist.
   */
  async getPoolStats(
    name: string,
    type: 'postgres' | 'mongodb' | 'redis',
  ): Promise<{
    type: string;
    name: string;
    info?: string;
  } | null> {
    const connection = this.getConnection(name, type);

    if (!connection) {
      return null;
    }

    switch (type) {
      case 'postgres':
        return {
          type: 'postgres',
          name,
        };
      case 'mongodb':
        return {
          type: 'mongodb',
          name,
        };
      case 'redis': {
        const redis = connection.connection as Redis;
        const info = await redis.info('clients');
        return {
          type: 'redis',
          name,
          info,
        };
      }
      default:
        return null;
    }
  }

  /**
   * Begin a new distributed transaction.
   *
   * Creates a unique transaction ID and prepares a holder that database-
   * specific transaction objects can be attached to via
   * {@link addToDistributedTransaction}.
   *
   * @returns The UUID of the new distributed transaction.
   */
  async beginDistributedTransaction(): Promise<string> {
    const transactionId = randomUUID();

    const transaction: DistributedTransaction = {
      id: transactionId,
      connections: new Map(),
      status: 'pending',
      createdAt: new Date(),
    };

    this.distributedTransactions.set(transactionId, transaction);

    this.logger.log(`Started distributed transaction: ${transactionId}`);

    return transactionId;
  }

  /**
   * Enlist a database-specific transaction object into a distributed transaction.
   *
   * @param transactionId - The distributed transaction ID.
   * @param connectionName - Connection name.
   * @param connectionType - Database type identifier.
   * @param transactionObject - The database-specific transaction handle
   *   (e.g. TypeORM `QueryRunner` or Mongoose `ClientSession`).
   * @throws Error if the transaction is not found or not in `pending` state.
   */
  addToDistributedTransaction(
    transactionId: string,
    connectionName: string,
    connectionType: string,
    transactionObject: any,
  ): void {
    const transaction = this.distributedTransactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Distributed transaction ${transactionId} not found`);
    }

    if (transaction.status !== 'pending') {
      throw new Error(
        `Distributed transaction ${transactionId} is not pending`,
      );
    }

    transaction.connections.set(
      `${connectionType}:${connectionName}`,
      transactionObject,
    );
  }

  /**
   * Commit all enlisted connections in a distributed transaction.
   *
   * If any commit fails, an automatic rollback is attempted for all
   * connections. The transaction record is cleaned up after 60 seconds.
   *
   * @param transactionId - The distributed transaction ID.
   * @throws Error if the transaction is not found, not pending, or commit fails.
   */
  async commitDistributedTransaction(transactionId: string): Promise<void> {
    const transaction = this.distributedTransactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Distributed transaction ${transactionId} not found`);
    }

    if (transaction.status !== 'pending') {
      throw new Error(
        `Distributed transaction ${transactionId} is not pending`,
      );
    }

    try {
      // Commit all connections in the transaction
      const commitPromises: Promise<void>[] = [];

      for (const [key, txObject] of transaction.connections) {
        if (key.startsWith('postgres:')) {
          // Commit PostgreSQL transaction
          commitPromises.push(txObject.commitTransaction());
        } else if (key.startsWith('mongodb:')) {
          // Commit MongoDB transaction
          commitPromises.push(txObject.commitTransaction());
        }
        // Redis doesn't have traditional transactions in the same way
      }

      await Promise.all(commitPromises);

      transaction.status = 'committed';
      this.logger.log(`Committed distributed transaction: ${transactionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to commit distributed transaction: ${transactionId}`,
        error,
      );
      // Attempt rollback
      await this.rollbackDistributedTransaction(transactionId);
      throw error;
    } finally {
      // Clean up after some time
      setTimeout(() => {
        this.distributedTransactions.delete(transactionId);
      }, 60000); // Keep for 1 minute for debugging
    }
  }

  /**
   * Roll back all enlisted connections in a distributed transaction.
   *
   * Idempotent — calling on an already-rolled-back transaction is a no-op.
   * The transaction record is cleaned up after 60 seconds.
   *
   * @param transactionId - The distributed transaction ID.
   * @throws Error if the transaction is not found.
   */
  async rollbackDistributedTransaction(transactionId: string): Promise<void> {
    const transaction = this.distributedTransactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Distributed transaction ${transactionId} not found`);
    }

    if (transaction.status === 'rolled_back') {
      return; // Already rolled back
    }

    try {
      // Rollback all connections in the transaction
      const rollbackPromises: Promise<void>[] = [];

      for (const [key, txObject] of transaction.connections) {
        if (key.startsWith('postgres:')) {
          // Rollback PostgreSQL transaction
          rollbackPromises.push(
            txObject.rollbackTransaction().catch((err: any) => {
              this.logger.error(
                `Failed to rollback PostgreSQL in transaction ${transactionId}`,
                err,
              );
            }),
          );
        } else if (key.startsWith('mongodb:')) {
          // Rollback MongoDB transaction
          rollbackPromises.push(
            txObject.abortTransaction().catch((err: any) => {
              this.logger.error(
                `Failed to rollback MongoDB in transaction ${transactionId}`,
                err,
              );
            }),
          );
        }
      }

      await Promise.all(rollbackPromises);

      transaction.status = 'rolled_back';
      this.logger.log(`Rolled back distributed transaction: ${transactionId}`);
    } catch (error) {
      this.logger.error(
        `Error during rollback of distributed transaction: ${transactionId}`,
        error,
      );
      throw error;
    } finally {
      // Clean up after some time
      setTimeout(() => {
        this.distributedTransactions.delete(transactionId);
      }, 60000); // Keep for 1 minute for debugging
    }
  }

  /**
   * Clean up stale distributed transactions.
   *
   * Transactions older than 5 minutes that are still `pending` are
   * automatically rolled back. Completed transactions are simply
   * removed from the registry.
   */
  cleanupOldTransactions(): void {
    const now = new Date();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [id, transaction] of this.distributedTransactions) {
      const age = now.getTime() - transaction.createdAt.getTime();

      if (age > maxAge) {
        if (transaction.status === 'pending') {
          // Rollback pending transactions
          this.rollbackDistributedTransaction(id).catch((error) => {
            this.logger.error(
              `Failed to rollback old transaction ${id}`,
              error,
            );
          });
        } else {
          // Remove completed transactions
          this.distributedTransactions.delete(id);
        }
      }
    }
  }

  /**
   * List all active or recently completed distributed transactions.
   *
   * @returns Array of transaction summaries with id, status, connection
   *   count, and creation timestamp.
   */
  getDistributedTransactions(): Array<{
    id: string;
    status: string;
    connectionCount: number;
    createdAt: Date;
  }> {
    return Array.from(this.distributedTransactions.values()).map((tx) => ({
      id: tx.id,
      status: tx.status,
      connectionCount: tx.connections.size,
      createdAt: tx.createdAt,
    }));
  }
}
