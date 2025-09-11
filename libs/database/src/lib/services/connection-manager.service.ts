import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Connection } from 'mongoose';
import { Redis } from 'ioredis';
import {
  DatabaseConnection,
  ConnectionMetrics,
} from '../interfaces/database.interface';
import { v4 as uuidv4 } from 'uuid';

interface DistributedTransaction {
  id: string;
  connections: Map<string, any>;
  status: 'pending' | 'committed' | 'rolled_back';
  createdAt: Date;
}

@Injectable()
export class ConnectionManagerService {
  private readonly logger = new Logger(ConnectionManagerService.name);
  private readonly connections: Map<string, DatabaseConnection> = new Map();
  private readonly connectionMetrics: Map<string, ConnectionMetrics> =
    new Map();
  private readonly distributedTransactions: Map<
    string,
    DistributedTransaction
  > = new Map();

  /**
   * Register a PostgreSQL connection
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
        error
      );
      throw error;
    }
  }

  /**
   * Register a MongoDB connection
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
        error
      );
      throw error;
    }
  }

  /**
   * Register a Redis connection
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
   * Get a specific connection
   */
  getConnection(
    name: string,
    type: 'postgres' | 'mongodb' | 'redis'
  ): DatabaseConnection | null {
    const key = `${type}:${name}`;
    const connection = this.connections.get(key);

    if (connection) {
      connection.lastUsed = new Date();
    }

    return connection || null;
  }

  /**
   * Get all connections
   */
  getAllConnections(): DatabaseConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connections by type
   */
  getConnectionsByType(
    type: 'postgres' | 'mongodb' | 'redis'
  ): DatabaseConnection[] {
    return Array.from(this.connections.entries())
      .filter(([key]) => key.startsWith(`${type}:`))
      .map(([, connection]) => connection);
  }

  /**
   * Update connection metrics
   */
  updateMetrics(
    name: string,
    type: 'postgres' | 'mongodb' | 'redis',
    update: Partial<{
      query: boolean;
      failed: boolean;
      queryTime: number;
      slow: boolean;
    }>
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
   * Get connection metrics
   */
  getMetrics(
    name: string,
    type: 'postgres' | 'mongodb' | 'redis'
  ): ConnectionMetrics | null {
    const key = `${type}:${name}`;
    return this.connectionMetrics.get(key) || null;
  }

  /**
   * Initialize metrics object
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
   * Check if a connection is healthy
   */
  async isHealthy(
    name: string,
    type: 'postgres' | 'mongodb' | 'redis'
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
   * Get connection pool statistics
   */
  async getPoolStats(
    name: string,
    type: 'postgres' | 'mongodb' | 'redis'
  ): Promise<any> {
    const connection = this.getConnection(name, type);

    if (!connection) {
      return null;
    }

    switch (type) {
      case 'postgres':
        // Would need to get stats from TypeORM DataSource
        return {
          type: 'postgres',
          name,
          // Additional stats would come from DataSource
        };
      case 'mongodb':
        // Would need to get stats from Mongoose Connection
        return {
          type: 'mongodb',
          name,
          // Additional stats would come from Connection
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
   * Begin a distributed transaction
   */
  async beginDistributedTransaction(): Promise<string> {
    const transactionId = uuidv4();

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
   * Add a connection to a distributed transaction
   */
  addToDistributedTransaction(
    transactionId: string,
    connectionName: string,
    connectionType: string,
    transactionObject: any
  ): void {
    const transaction = this.distributedTransactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Distributed transaction ${transactionId} not found`);
    }

    if (transaction.status !== 'pending') {
      throw new Error(
        `Distributed transaction ${transactionId} is not pending`
      );
    }

    transaction.connections.set(
      `${connectionType}:${connectionName}`,
      transactionObject
    );
  }

  /**
   * Commit a distributed transaction
   */
  async commitDistributedTransaction(transactionId: string): Promise<void> {
    const transaction = this.distributedTransactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Distributed transaction ${transactionId} not found`);
    }

    if (transaction.status !== 'pending') {
      throw new Error(
        `Distributed transaction ${transactionId} is not pending`
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
        error
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
   * Rollback a distributed transaction
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
                err
              );
            })
          );
        } else if (key.startsWith('mongodb:')) {
          // Rollback MongoDB transaction
          rollbackPromises.push(
            txObject.abortTransaction().catch((err: any) => {
              this.logger.error(
                `Failed to rollback MongoDB in transaction ${transactionId}`,
                err
              );
            })
          );
        }
      }

      await Promise.all(rollbackPromises);

      transaction.status = 'rolled_back';
      this.logger.log(`Rolled back distributed transaction: ${transactionId}`);
    } catch (error) {
      this.logger.error(
        `Error during rollback of distributed transaction: ${transactionId}`,
        error
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
   * Clean up old distributed transactions
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
              error
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
   * Get all distributed transactions
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
