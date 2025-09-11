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

@Injectable()
export class PostgresService {
  private readonly logger = new Logger(PostgresService.name);
  private readonly connections: Map<string, DataSource> = new Map();
  private readonly repositories: Map<string, Map<string, Repository<any>>> =
    new Map();

  private readonly configs: Array<{
    name: string;
    config: PostgresConnectionConfig;
  }> = [];

  constructor(
    private readonly optimizationService: QueryOptimizationService,
    private readonly connectionManager: ConnectionManagerService
  ) {}

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
            `PostgreSQL connection '${name}' registered successfully`
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to register PostgreSQL connection '${name}'`,
          error
        );
        throw error;
      }
    }
  }

  /**
   * Get a specific connection by name
   */
  getConnection(name: string): DataSource {
    const connection = this.connections.get(name);
    if (!connection) {
      throw new Error(`PostgreSQL connection '${name}' not found`);
    }
    return connection;
  }

  /**
   * Get repository for an entity
   */
  getRepository<T extends ObjectLiteral>(
    connectionName: string,
    entity?: EntityTarget<T>
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
   * Execute a raw SQL query
   */
  async executeRawQuery(
    connectionName: string,
    query: string,
    parameters?: any[]
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
   * Find records with advanced filtering, pagination, and sorting
   */
  async find<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    options: QueryOptions = {}
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
   * Create a new record
   */
  async create<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    data: Partial<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const repository = this.getRepository<T>(connectionName, entity);

    if (options.transaction) {
      return options.transaction.manager.save(entity, data as any);
    }

    const instance = repository.create(data as any);
    const saved = await repository.save(instance);
    return saved as T;
  }

  /**
   * Bulk create records
   */
  async createMany<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    data: Partial<T>[],
    options: QueryOptions = {}
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
   * Update a record
   */
  async update<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    id: string | number,
    data: Partial<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const repository = this.getRepository<T>(connectionName, entity);
    const manager = options.transaction?.manager || repository.manager;

    await manager.update(entity, id, data as any);
    return manager.findOne(entity, { where: { id } as any }) as Promise<T>;
  }

  /**
   * Update multiple records
   */
  async updateMany<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    filter: FilterOptions[],
    data: Partial<T>
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
   * Delete a record
   */
  async delete<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    id: string | number,
    options: QueryOptions = {}
  ): Promise<boolean> {
    const repository = this.getRepository<T>(connectionName, entity);
    const manager = options.transaction?.manager || repository.manager;

    const result = await manager.delete(entity, id);
    return (result.affected || 0) > 0;
  }

  /**
   * Delete multiple records
   */
  async deleteMany<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    filter: FilterOptions[]
  ): Promise<number> {
    const repository = this.getRepository<T>(connectionName, entity);
    const queryBuilder = repository.createQueryBuilder('entity');

    this.applyFilters(queryBuilder, filter);

    const result = await queryBuilder.delete().execute();
    return result.affected || 0;
  }

  /**
   * Count records
   */
  async count<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    filter?: FilterOptions[]
  ): Promise<number> {
    const repository = this.getRepository<T>(connectionName, entity);
    const queryBuilder = repository.createQueryBuilder('entity');

    if (filter?.length) {
      this.applyFilters(queryBuilder, filter);
    }

    return queryBuilder.getCount();
  }

  /**
   * Perform aggregation
   */
  async aggregate<T extends ObjectLiteral>(
    connectionName: string,
    entity: EntityTarget<T>,
    options: AggregationOptions
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
            condition.operator
          )} :${paramName}`,
          {
            [paramName]: condition.value,
          }
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
          options.groupBy?.reduce((acc, field) => {
            acc[field] = row[`entity_${field}`];
            return acc;
          }, {} as Record<string, any>) || {},
        count: row.count ? parseInt(row.count) : undefined,
        sum: options.sum?.reduce((acc, field) => {
          acc[field] = parseFloat(row[`sum_${field}`]) || 0;
          return acc;
        }, {} as Record<string, number>),
        avg: options.avg?.reduce((acc, field) => {
          acc[field] = parseFloat(row[`avg_${field}`]) || 0;
          return acc;
        }, {} as Record<string, number>),
        min: options.min?.reduce((acc, field) => {
          acc[field] = row[`min_${field}`];
          return acc;
        }, {} as Record<string, any>),
        max: options.max?.reduce((acc, field) => {
          acc[field] = row[`max_${field}`];
          return acc;
        }, {} as Record<string, any>),
      })),
      total: results.length,
      executionTime,
    };
  }

  /**
   * Execute a transaction
   */
  async transaction<R>(
    connectionName: string,
    fn: (queryRunner: QueryRunner) => Promise<R>,
    options: TransactionOptions = {}
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
   * Execute any operation
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
   * Close all connections
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
          error
        );
      }
    }
    this.connections.clear();
    this.repositories.clear();
  }

  /**
   * Apply filters to query builder
   */
  private applyFilters<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    filters: FilterOptions[]
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
            }
          );
          break;
        case 'nin':
          queryBuilder.andWhere(
            `entity.${filter.field} NOT IN (:...${paramName})`,
            {
              [paramName]: filter.value,
            }
          );
          break;
        case 'between':
          queryBuilder.andWhere(
            `entity.${filter.field} BETWEEN :${paramName}_start AND :${paramName}_end`,
            {
              [`${paramName}_start`]: filter.value[0],
              [`${paramName}_end`]: filter.value[1],
            }
          );
          break;
        case 'like':
        case 'ilike':
          queryBuilder.andWhere(
            `entity.${filter.field} ${operator} :${paramName}`,
            {
              [paramName]: `%${filter.value}%`,
            }
          );
          break;
        case 'startsWith':
          queryBuilder.andWhere(
            `entity.${filter.field} ${
              filter.caseSensitive ? 'LIKE' : 'ILIKE'
            } :${paramName}`,
            {
              [paramName]: `${filter.value}%`,
            }
          );
          break;
        case 'endsWith':
          queryBuilder.andWhere(
            `entity.${filter.field} ${
              filter.caseSensitive ? 'LIKE' : 'ILIKE'
            } :${paramName}`,
            {
              [paramName]: `%${filter.value}`,
            }
          );
          break;
        default:
          queryBuilder.andWhere(
            `entity.${filter.field} ${operator} :${paramName}`,
            {
              [paramName]: filter.value,
            }
          );
      }
    });
  }

  /**
   * Apply search to query builder
   */
  private applySearch<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    search: SearchOptions
  ): void {
    const conditions = search.fields.map((field, index) => {
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
   * Apply sorting to query builder
   */
  private applySorting<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    sort: SortOptions[]
  ): void {
    sort.forEach((sortOption) => {
      queryBuilder.addOrderBy(`entity.${sortOption.field}`, sortOption.order);
    });
  }

  /**
   * Get SQL operator for filter operator
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
    };

    return operatorMap[operator] || '=';
  }
}
