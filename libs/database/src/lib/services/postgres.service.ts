/**
 * @fileoverview PostgreSQL service for TypeORM-based database operations
 * @module database/services
 * @description Provides a high-level abstraction over TypeORM's `DataSource` and
 * `Repository` APIs for PostgreSQL databases. Handles connection management,
 * CRUD operations, advanced filtering, full-text search, aggregation,
 * transactions, and automatic query performance tracking.
 *
 * This service is **not** intended to be used directly by feature modules —
 * prefer extending {@link BasePostgresRepository} for entity-specific logic.
 * Direct usage is appropriate for raw SQL queries or cross-entity operations.
 *
 * @author Outhan Chazima
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  DataSource,
  Repository,
  QueryRunner,
  SelectQueryBuilder,
  EntityTarget,
  ObjectLiteral,
} from 'typeorm';
import {
  PostgresConnectionConfig,
  QueryOptions,
  PaginationResult,
  FilterOptions,
  SortOptions,
  SearchOptions,
  TransactionOptions,
  BulkWriteResult,
  AggregationOptions,
  AggregationResult,
} from '../interfaces/database.interface';
import { QueryOptimizationService } from './query-optimization.service';
import { ConnectionManagerService } from './connection-manager.service';

/**
 * Service for managing PostgreSQL connections and operations via TypeORM.
 *
 * @class PostgresService
 * @description Manages named PostgreSQL `DataSource` connections, provides
 * typed repository access, and exposes high-level methods for querying,
 * creating, updating, deleting, counting, and aggregating records. Every
 * query is automatically tracked by the {@link QueryOptimizationService}
 * for performance analysis.
 *
 * @example
 * ```typescript
 * // Typically injected via NestJS DI:
 * @Injectable()
 * export class ReportService {
 *   constructor(private readonly pg: PostgresService) {}
 *
 *   async getActiveUsers() {
 *     return this.pg.find('main', User, {
 *       filter: [{ field: 'status', operator: 'eq', value: 'active' }],
 *       sort: [{ field: 'createdAt', order: 'DESC' }],
 *       page: 1,
 *       limit: 50,
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export class PostgresService {
  /** Logger scoped to this service */
  private readonly logger = new Logger(PostgresService.name);

  /** Map of connection name → TypeORM `DataSource` */
  private readonly connections: Map<string, DataSource> = new Map();

  /** Nested map of connection name → entity name → TypeORM `Repository` */
  private readonly repositories: Map<string, Map<string, Repository<any>>> =
    new Map();

  /** Registered connection configurations awaiting initialisation */
  private readonly configs: Array<{
    name: string;
    config: PostgresConnectionConfig;
  }> = [];

  /**
   * Creates an instance of PostgresService.
   *
   * @param optimizationService - Tracks query performance metrics.
   * @param connectionManager - Central registry for all database connections.
   */
  constructor(
    private readonly optimizationService: QueryOptimizationService,
    private readonly connectionManager: ConnectionManagerService,
  ) {}

  /**
   * Initialise all registered PostgreSQL connections.
   *
   * Called automatically by {@link DatabaseService.onModuleInit}. For each
   * entry in {@link configs}, the connection is registered with the
   * {@link ConnectionManagerService} and a repository cache is prepared.
   *
   * @throws Error if any connection fails to register.
   */
  async initialize(): Promise<void> {
    for (const { name } of this.configs) {
      try {
        // Connection is already established by TypeORM module
        // We just need to register it in our service
        const connection =
          await this.connectionManager.registerPostgresConnection(name);
        if (connection) {
          this.connections.set(name, connection as DataSource);
          this.repositories.set(name, new Map());
          this.logger.log(
            `PostgreSQL connection '${name}' registered successfully`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to register PostgreSQL connection '${name}'`,
          error,
        );
        throw error;
      }
    }
  }

  /**
   * Retrieve a named PostgreSQL `DataSource`.
   *
   * @param name - Connection name as declared in {@link DatabaseModuleOptions.postgres}.
   * @returns The initialised TypeORM `DataSource`.
   * @throws Error if no connection with the given name exists.
   *
   * @example
   * ```typescript
   * const ds = postgresService.getConnection('main');
   * console.log(ds.isInitialized); // true
   * ```
   */
  getConnection(name: string): DataSource {
    const connection = this.connections.get(name);
    if (!connection) {
      throw new Error(`PostgreSQL connection '${name}' not found`);
    }
    return connection;
  }

  /**
   * Get (or lazily create) a TypeORM `Repository` for an entity.
   *
   * Repositories are cached per connection + entity name, so subsequent
   * calls with the same arguments return the same instance.
   *
   * @template T - Entity type extending `ObjectLiteral`.
   * @param connectionName - Name of the PostgreSQL connection.
   * @param entity - Entity class, schema, or `undefined` for a generic repository.
   * @returns A typed TypeORM `Repository<T>`.
   * @throws Error if the underlying connection does not exist.
   *
   * @example
   * ```typescript
   * const userRepo = postgresService.getRepository('main', User);
   * const users = await userRepo.find();
   * ```
   */
  getRepository<T extends ObjectLiteral>(
    connectionName: string,
    entity?: EntityTarget<T>,
  ): Repository<T> {
    const connection = this.getConnection(connectionName);

    if (!entity) {
      // Return a generic repository if no entity specified
      return connection.manager.getRepository(Object as any);
    }

    const entityName =
      typeof entity === 'string' ? entity : (entity as any).name || 'Entity';
    const repoMap = this.repositories.get(connectionName);

    if (!repoMap?.has(entityName)) {
      const repo = connection.getRepository(entity);
      repoMap?.set(entityName, repo);
      return repo;
    }

    return repoMap.get(entityName) as Repository<T>;
  }

  /**
   * Execute a raw SQL query against a named connection.
   *
   * The query execution time is automatically recorded by the
   * {@link QueryOptimizationService}.
   *
   * @param connectionName - Name of the PostgreSQL connection.
   * @param query - Raw SQL string. Use `$1`, `$2` … for parameterised queries.
   * @param parameters - Optional ordered array of parameter values.
   * @returns Promise resolving to the raw query result rows.
   * @throws Error if the query fails (logged at error level).
   *
   * @example
   * ```typescript
   * const rows = await postgresService.executeRawQuery(
   *   'main',
   *   'SELECT * FROM users WHERE age > $1 AND status = $2',
   *   [18, 'active'],
   * );
   * ```
   */
  async executeRawQuery(
    connectionName: string,
    query: string,
    parameters?: any[],
  ): Promise<any> {
    const connection = this.getConnection(connectionName);
    const startTime = Date.now();

    try {
      const result = await connection.query(query, parameters);

      // Log performance metrics
      const executionTime = Date.now() - startTime;
      this.optimizationService.recordQuery({
        query,
        executionTime,
        rowsAffected: result.length || 0,
        cached: false,
        slow: executionTime > 1000,
        timestamp: new Date(),
        connection: connectionName,
      });

      return result;
    } catch (error) {
      this.logger.error(`Query execution failed on ${connectionName}`, error);
      throw error;
    }
  }

  /**
   * Find records with advanced filtering, pagination, and sorting.
   *
   * Builds a `SelectQueryBuilder`, applies filters, search, sorting,
   * field selection, and pagination, then executes the query with
   * automatic performance tracking.
   *
   * @template T - Entity type extending `ObjectLiteral`.
   * @param connectionName - Name of the PostgreSQL connection.
   * @param entity - Entity class or schema to query.
   * @param options - Query options controlling filters, search, sort,
   *   field selection, pagination, and explain mode.
   * @returns Promise resolving to a {@link PaginationResult} containing
   *   data rows, pagination metadata, and execution-time info.
   *
   * @example
   * ```typescript
   * const result = await postgresService.find('main', User, {
   *   filter: [{ field: 'status', operator: 'eq', value: 'active' }],
   *   sort: [{ field: 'createdAt', order: 'DESC' }],
   *   search: { query: 'john', fields: ['name', 'email'] },
   *   page: 1,
   *   limit: 20,
   * });
   * // result.data          → User[]
   * // result.pagination    → { page, limit, total, totalPages, hasNext, hasPrev }
   * // result.meta          → { executionTime, cached }
   * ```
   */
  async find<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    options: QueryOptions = {},
  ): Promise<PaginationResult<T>> {
    const repository = this.getRepository<T>(connectionName, entity);
    const queryBuilder = repository.createQueryBuilder('entity');

    // Apply filters
    if (options.filter?.length) {
      this.applyFilters(queryBuilder, options.filter);
    }

    // Apply search
    if (options.search) {
      this.applySearch(queryBuilder, options.search);
    }

    // Apply sorting
    if (options.sort?.length) {
      this.applySorting(queryBuilder, options.sort);
    }

    // Apply selection
    if (options.select?.length) {
      queryBuilder.select(options.select.map((field) => `entity.${field}`));
    }

    // Get total count before pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    // Add query explanation if requested
    if (options.explain) {
      const sql = queryBuilder.getSql();
      this.logger.debug(`Query explanation: ${sql}`);
    }

    // Execute query with performance tracking
    const startTime = Date.now();
    const data = await queryBuilder.getMany();
    const executionTime = Date.now() - startTime;

    // Record performance metrics
    this.optimizationService.recordQuery({
      query: queryBuilder.getSql(),
      executionTime,
      rowsAffected: data.length,
      cached: false,
      slow: executionTime > 1000,
      timestamp: new Date(),
      connection: connectionName,
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      meta: {
        executionTime,
        cached: false,
        query: options.explain ? queryBuilder.getSql() : undefined,
      },
    };
  }

  /**
   * Create and persist a new record.
   *
   * If a {@link QueryOptions.transaction | transaction} is provided in the
   * options, the insert runs within that transaction's manager.
   *
   * @template T - Entity type extending `ObjectLiteral`.
   * @param connectionName - Name of the PostgreSQL connection.
   * @param entity - Entity class or schema.
   * @param data - Partial entity data for the new record.
   * @param options - Query options (only `transaction` is used here).
   * @returns Promise resolving to the saved entity.
   *
   * @example
   * ```typescript
   * const user = await postgresService.create('main', User, {
   *   name: 'Jane',
   *   email: 'jane@example.com',
   * });
   * ```
   */
  async create<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    data: Partial<T>,
    options: QueryOptions = {},
  ): Promise<T> {
    const repository = this.getRepository<T>(connectionName, entity);

    if (options.transaction) {
      return options.transaction.manager.save(entity, data as any);
    }

    const instance = repository.create(data as any);
    const saved = await repository.save(instance);
    return saved as unknown as T;
  }

  /**
   * Bulk-create records in batches of 1 000.
   *
   * If a batch insert fails, the method falls back to individual inserts
   * within that batch to identify the problematic records, collecting
   * per-row errors in the returned {@link BulkWriteResult}.
   *
   * @template T - Entity type extending `ObjectLiteral`.
   * @param connectionName - Name of the PostgreSQL connection.
   * @param entity - Entity class or schema.
   * @param data - Array of partial entity data to insert.
   * @param options - Query options (only `transaction` is used here).
   * @returns Promise resolving to a {@link BulkWriteResult} with
   *   `insertedCount` and optional `errors` array.
   * @throws Error if the entire bulk operation fails irrecoverably.
   *
   * @example
   * ```typescript
   * const result = await postgresService.createMany('main', User, [
   *   { name: 'Alice' },
   *   { name: 'Bob' },
   * ]);
   * console.log(result.insertedCount); // 2
   * ```
   */
  async createMany<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    data: Partial<T>[],
    options: QueryOptions = {},
  ): Promise<BulkWriteResult> {
    const repository = this.getRepository<T>(connectionName, entity);
    const manager = options.transaction?.manager || repository.manager;

    const errors: Array<{ index: number; error: Error; document?: any }> = [];
    let insertedCount = 0;

    try {
      // Use batch insert for better performance
      const batchSize = 1000;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const instances = repository.create(batch as any);

        try {
          await manager.save(entity, instances);
          insertedCount += batch.length;
        } catch {
          // If batch fails, try individual inserts to identify problematic records
          for (let j = 0; j < batch.length; j++) {
            try {
              await manager.save(entity, batch[j]);
              insertedCount++;
            } catch (individualError) {
              errors.push({
                index: i + j,
                error: individualError as Error,
                document: batch[j],
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Bulk create failed', error);
      throw error;
    }

    return {
      insertedCount,
      updatedCount: 0,
      deletedCount: 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Update a record by its primary key.
   *
   * @template T - Entity type extending `ObjectLiteral`.
   * @param connectionName - Name of the PostgreSQL connection.
   * @param entity - Entity class or schema.
   * @param id - Primary key of the record to update.
   * @param data - Partial entity data with new values.
   * @param options - Query options (only `transaction` is used here).
   * @returns Promise resolving to the freshly-fetched updated entity.
   */
  async update<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    id: string | number,
    data: Partial<T>,
    options: QueryOptions = {},
  ): Promise<T> {
    const repository = this.getRepository<T>(connectionName, entity);
    const manager = options.transaction?.manager || repository.manager;

    await manager.update(entity, id, data as any);
    return manager.findOne(entity, { where: { id } as any }) as Promise<T>;
  }

  /**
   * Update multiple records matching the given filters.
   *
   * @template T - Entity type extending `ObjectLiteral`.
   * @param connectionName - Name of the PostgreSQL connection.
   * @param entity - Entity class or schema.
   * @param filter - Array of {@link FilterOptions} to identify target rows.
   * @param data - Partial entity data with new values.
   * @returns Promise resolving to the number of affected rows.
   */
  async updateMany<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    filter: FilterOptions[],
    data: Partial<T>,
  ): Promise<number> {
    const repository = this.getRepository<T>(connectionName, entity);
    const queryBuilder = repository.createQueryBuilder('entity');

    this.applyFilters(queryBuilder, filter);

    const result = await queryBuilder
      .update()
      .set(data as any)
      .execute();
    return result.affected || 0;
  }

  /**
   * Hard-delete a record by its primary key.
   *
   * @template T - Entity type extending `ObjectLiteral`.
   * @param connectionName - Name of the PostgreSQL connection.
   * @param entity - Entity class or schema.
   * @param id - Primary key of the record to delete.
   * @param options - Query options (only `transaction` is used here).
   * @returns `true` if a row was deleted, `false` otherwise.
   */
  async delete<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    id: string | number,
    options: QueryOptions = {},
  ): Promise<boolean> {
    const repository = this.getRepository<T>(connectionName, entity);
    const manager = options.transaction?.manager || repository.manager;

    const result = await manager.delete(entity, id);
    return (result.affected || 0) > 0;
  }

  /**
   * Hard-delete multiple records matching the given filters.
   *
   * @template T - Entity type extending `ObjectLiteral`.
   * @param connectionName - Name of the PostgreSQL connection.
   * @param entity - Entity class or schema.
   * @param filter - Array of {@link FilterOptions} to identify target rows.
   * @returns Promise resolving to the number of deleted rows.
   */
  async deleteMany<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    filter: FilterOptions[],
  ): Promise<number> {
    const repository = this.getRepository<T>(connectionName, entity);
    const queryBuilder = repository.createQueryBuilder('entity');

    this.applyFilters(queryBuilder, filter);

    const result = await queryBuilder.delete().execute();
    return result.affected || 0;
  }

  /**
   * Count records matching optional filters.
   *
   * @template T - Entity type extending `ObjectLiteral`.
   * @param connectionName - Name of the PostgreSQL connection.
   * @param entity - Entity class or schema.
   * @param filter - Optional array of {@link FilterOptions} to narrow the count.
   * @returns Promise resolving to the number of matching rows.
   */
  async count<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    filter?: FilterOptions[],
  ): Promise<number> {
    const repository = this.getRepository<T>(connectionName, entity);
    const queryBuilder = repository.createQueryBuilder('entity');

    if (filter?.length) {
      this.applyFilters(queryBuilder, filter);
    }

    return queryBuilder.getCount();
  }

  /**
   * Perform SQL-level aggregation (GROUP BY, SUM, AVG, MIN, MAX, COUNT).
   *
   * Builds a query with grouping, aggregate functions, HAVING clauses,
   * sorting, and an optional LIMIT. Results are returned in the
   * normalised {@link AggregationResult} structure.
   *
   * @template T - Entity type extending `ObjectLiteral`.
   * @param connectionName - Name of the PostgreSQL connection.
   * @param entity - Entity class or schema.
   * @param options - Aggregation configuration (groupBy, count, sum, avg, min,
   *   max, having, sort, limit).
   * @returns Promise resolving to an {@link AggregationResult} with grouped data.
   *
   * @example
   * ```typescript
   * const result = await postgresService.aggregate('main', Order, {
   *   groupBy: ['status'],
   *   count: true,
   *   sum: ['amount'],
   *   sort: [{ field: 'count', order: 'DESC' }],
   * });
   * ```
   */
  async aggregate<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    options: AggregationOptions,
  ): Promise<AggregationResult> {
    const repository = this.getRepository<T>(connectionName, entity);
    const queryBuilder = repository.createQueryBuilder('entity');

    // Apply grouping
    if (options.groupBy?.length) {
      const groupByFields = options.groupBy.map((field) => `entity.${field}`);
      queryBuilder.groupBy(groupByFields.join(', '));
      queryBuilder.select(groupByFields);
    }

    // Apply aggregations
    if (options.count) {
      queryBuilder.addSelect('COUNT(*)', 'count');
    }

    if (options.sum?.length) {
      options.sum.forEach((field) => {
        queryBuilder.addSelect(`SUM(entity.${field})`, `sum_${field}`);
      });
    }

    if (options.avg?.length) {
      options.avg.forEach((field) => {
        queryBuilder.addSelect(`AVG(entity.${field})`, `avg_${field}`);
      });
    }

    if (options.min?.length) {
      options.min.forEach((field) => {
        queryBuilder.addSelect(`MIN(entity.${field})`, `min_${field}`);
      });
    }

    if (options.max?.length) {
      options.max.forEach((field) => {
        queryBuilder.addSelect(`MAX(entity.${field})`, `max_${field}`);
      });
    }

    // Apply having clause
    if (options.having?.length) {
      options.having.forEach((condition, index) => {
        const paramName = `having_${index}`;
        queryBuilder.andHaving(
          `${condition.field} ${this.getOperatorSQL(
            condition.operator,
          )} :${paramName}`,
          {
            [paramName]: condition.value,
          },
        );
      });
    }

    // Apply sorting
    if (options.sort?.length) {
      this.applySorting(queryBuilder, options.sort);
    }

    // Apply limit
    if (options.limit) {
      queryBuilder.limit(options.limit);
    }

    const startTime = Date.now();
    const results = await queryBuilder.getRawMany();
    const executionTime = Date.now() - startTime;

    return {
      groups: results.map((row) => ({
        key:
          options.groupBy?.reduce(
            (acc, field) => {
              acc[field] = row[`entity_${field}`];
              return acc;
            },
            {} as Record<string, any>,
          ) || {},
        count: row.count ? parseInt(row.count) : undefined,
        sum: options.sum?.reduce<Record<string, number>>((acc, field) => {
          acc[field] = parseFloat(row[`sum_${field}`]) || 0;
          return acc;
        }, {}),
        avg: options.avg?.reduce<Record<string, number>>((acc, field) => {
          acc[field] = parseFloat(row[`avg_${field}`]) || 0;
          return acc;
        }, {}),
        min: options.min?.reduce<Record<string, unknown>>((acc, field) => {
          acc[field] = row[`min_${field}`];
          return acc;
        }, {}),
        max: options.max?.reduce<Record<string, unknown>>((acc, field) => {
          acc[field] = row[`max_${field}`];
          return acc;
        }, {}),
      })),
      total: results.length,
      executionTime,
    };
  }

  /**
   * Execute a callback within a database transaction.
   *
   * Creates a dedicated `QueryRunner`, starts a transaction with the
   * requested isolation level, executes the callback, and commits on
   * success or rolls back on failure. The runner is always released.
   *
   * @template R - Return type of the transaction callback.
   * @param connectionName - Name of the PostgreSQL connection.
   * @param fn - Async callback receiving the `QueryRunner` (use its
   *   `.manager` to perform operations within the transaction).
   * @param options - Transaction options (isolation level, timeout, retries).
   * @returns Promise resolving to the callback's return value.
   * @throws Re-throws any error from the callback after rollback.
   *
   * @example
   * ```typescript
   * const order = await postgresService.transaction('main', async (qr) => {
   *   const order = await qr.manager.save(Order, orderData);
   *   await qr.manager.save(OrderItem, itemsData);
   *   return order;
   * }, { isolationLevel: 'SERIALIZABLE' });
   * ```
   */
  async transaction<R>(
    connectionName: string,
    fn: (queryRunner: QueryRunner) => Promise<R>,
    options: TransactionOptions = {},
  ): Promise<R> {
    const connection = this.getConnection(connectionName);
    const queryRunner = connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction(options.isolationLevel);

    try {
      const result = await fn(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Dynamically dispatch a named operation.
   *
   * Used by {@link DatabaseService.routeQuery} to forward operations
   * without hard-coding a switch for every method.
   *
   * @param connectionName - Name of the PostgreSQL connection.
   * @param operation - Method name to invoke (e.g. `'find'`, `'create'`).
   * @param args - Arguments forwarded to the resolved method.
   * @returns Promise resolving to the operation's result.
   * @throws Error if the operation name is not recognised.
   */
  async executeOperation(
    connectionName: string,
    operation: string,
    ...args: any[]
  ): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    const methodMap: Record<string, Function> = {
      find: this.find,
      create: this.create,
      update: this.update,
      delete: this.delete,
      count: this.count,
      aggregate: this.aggregate,
    };

    const method = methodMap[operation];
    if (!method) {
      throw new Error(`Unknown operation: ${operation}`);
    }

    return method.call(this, connectionName, ...args);
  }

  /**
   * Gracefully close all managed PostgreSQL connections.
   *
   * Iterates over every registered `DataSource`, destroys it if
   * initialised, and clears the internal connection + repository caches.
   */
  async closeAll(): Promise<void> {
    for (const [name, connection] of this.connections) {
      try {
        if (connection.isInitialized) {
          await connection.destroy();
          this.logger.log(`PostgreSQL connection '${name}' closed`);
        }
      } catch (error) {
        this.logger.error(
          `Error closing PostgreSQL connection '${name}'`,
          error,
        );
      }
    }
    this.connections.clear();
    this.repositories.clear();
  }

  /**
   * Apply an array of {@link FilterOptions} to a TypeORM `SelectQueryBuilder`.
   *
   * Each filter is translated into a parameterised `WHERE` clause using
   * `andWhere`. Supported operators:
   *
   * | Operator      | SQL equivalent                                |
   * |---------------|-----------------------------------------------|
   * | `eq`          | `= :param`                                    |
   * | `neq`         | `!= :param`                                   |
   * | `gt` / `gte`  | `>` / `>=`                                    |
   * | `lt` / `lte`  | `<` / `<=`                                    |
   * | `in`          | `IN (:...param)`                               |
   * | `nin`         | `NOT IN (:...param)`                           |
   * | `between`     | `BETWEEN :start AND :end`                     |
   * | `like`        | `LIKE '%val%'` (case-sensitive)                |
   * | `ilike`       | `ILIKE '%val%'` (case-insensitive)             |
   * | `contains`    | `ILIKE '%val%'` (respects `caseSensitive`)     |
   * | `startsWith`  | `ILIKE 'val%'` (respects `caseSensitive`)      |
   * | `endsWith`    | `ILIKE '%val'` (respects `caseSensitive`)      |
   * | `regex`       | `~ :param` (PostgreSQL POSIX regex)            |
   * | `isNull`      | `IS NULL`                                     |
   * | `isNotNull`   | `IS NOT NULL`                                 |
   *
   * @template T - Entity type extending `ObjectLiteral`.
   * @param queryBuilder - The query builder to append WHERE clauses to.
   * @param filters - Array of filter option objects.
   */
  private applyFilters<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    filters: FilterOptions[],
  ): void {
    filters.forEach((filter, index) => {
      const paramName = `filter_${index}`;
      const operator = this.getOperatorSQL(filter.operator);

      switch (filter.operator) {
        case 'isNull':
          queryBuilder.andWhere(`entity.${filter.field} IS NULL`);
          break;
        case 'isNotNull':
          queryBuilder.andWhere(`entity.${filter.field} IS NOT NULL`);
          break;
        case 'in':
          queryBuilder.andWhere(
            `entity.${filter.field} IN (:...${paramName})`,
            {
              [paramName]: filter.value,
            },
          );
          break;
        case 'nin':
          queryBuilder.andWhere(
            `entity.${filter.field} NOT IN (:...${paramName})`,
            {
              [paramName]: filter.value,
            },
          );
          break;
        case 'between':
          queryBuilder.andWhere(
            `entity.${filter.field} BETWEEN :${paramName}_start AND :${paramName}_end`,
            {
              [`${paramName}_start`]: (filter.value as unknown[])[0],
              [`${paramName}_end`]: (filter.value as unknown[])[1],
            },
          );
          break;
        case 'contains':
          queryBuilder.andWhere(
            `entity.${filter.field} ${filter.caseSensitive ? 'LIKE' : 'ILIKE'} :${paramName}`,
            {
              [paramName]: `%${filter.value}%`,
            },
          );
          break;
        case 'like':
        case 'ilike':
          queryBuilder.andWhere(
            `entity.${filter.field} ${operator} :${paramName}`,
            {
              [paramName]: `%${filter.value}%`,
            },
          );
          break;
        case 'startsWith':
          queryBuilder.andWhere(
            `entity.${filter.field} ${
              filter.caseSensitive ? 'LIKE' : 'ILIKE'
            } :${paramName}`,
            {
              [paramName]: `${filter.value}%`,
            },
          );
          break;
        case 'endsWith':
          queryBuilder.andWhere(
            `entity.${filter.field} ${
              filter.caseSensitive ? 'LIKE' : 'ILIKE'
            } :${paramName}`,
            {
              [paramName]: `%${filter.value}`,
            },
          );
          break;
        case 'regex':
          queryBuilder.andWhere(`entity.${filter.field} ~ :${paramName}`, {
            [paramName]: filter.value,
          });
          break;
        default:
          queryBuilder.andWhere(
            `entity.${filter.field} ${operator} :${paramName}`,
            {
              [paramName]: filter.value,
            },
          );
      }
    });
  }

  /**
   * Apply full-text search conditions to a query builder.
   *
   * Generates an `OR`-combined set of `LIKE` / `ILIKE` clauses across
   * the fields specified in {@link SearchOptions.fields}.
   *
   * @template T - Entity type extending `ObjectLiteral`.
   * @param queryBuilder - The query builder to append search clauses to.
   * @param search - Search configuration with query string and fields.
   */
  private applySearch<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    search: SearchOptions,
  ): void {
    const conditions = search.fields.map((field: string, index: number) => {
      const paramName = `search_${index}`;
      const operator = search.caseSensitive ? 'LIKE' : 'ILIKE';
      queryBuilder.setParameter(paramName, `%${search.query}%`);
      return `entity.${field} ${operator} :${paramName}`;
    });

    if (conditions.length > 0) {
      queryBuilder.andWhere(`(${conditions.join(' OR ')})`);
    }
  }

  /**
   * Apply sorting / ordering to a query builder.
   *
   * @template T - Entity type extending `ObjectLiteral`.
   * @param queryBuilder - The query builder to append ORDER BY to.
   * @param sort - Array of sort options (field + direction).
   */
  private applySorting<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    sort: SortOptions[],
  ): void {
    sort.forEach((sortOption) => {
      queryBuilder.addOrderBy(`entity.${sortOption.field}`, sortOption.order);
    });
  }

  /**
   * Map a {@link FilterOperator} to its PostgreSQL SQL symbol.
   *
   * @param operator - The abstract filter operator.
   * @returns The corresponding SQL operator string (e.g. `'='`, `'ILIKE'`, `'~'`).
   *   Defaults to `'='` for unrecognised operators.
   */
  private getOperatorSQL(operator: FilterOptions['operator']): string {
    const operatorMap: Record<string, string> = {
      eq: '=',
      neq: '!=',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
      like: 'LIKE',
      ilike: 'ILIKE',
      contains: 'ILIKE',
      startsWith: 'ILIKE',
      endsWith: 'ILIKE',
      regex: '~',
    };

    return operatorMap[operator] || '=';
  }
}
