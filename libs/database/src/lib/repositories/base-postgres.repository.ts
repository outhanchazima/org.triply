/**
 * @fileoverview Base repository implementation for PostgreSQL entities
 * @module database/repositories
 * @description Provides a reusable repository pattern for PostgreSQL entities with
 * TypeORM integration. Implements advanced querying, pagination, filtering, transactions,
 * and bulk operations.
 */

import { Repository, EntityTarget, QueryRunner } from 'typeorm';
import {
  IBaseRepository,
  QueryOptions,
  PaginationResult,
  FilterOptions,
  BulkWriteResult,
  AggregationOptions,
  AggregationResult,
  TransactionOptions,
  SearchOptions,
  BulkOperationOptions,
} from '../interfaces/database.interface';
import { PostgresService } from '../services/postgres.service';

/**
 * Base repository class for PostgreSQL entities
 * @class BasePostgresRepository
 * @template T - Entity type
 * @implements {IBaseRepository<T>}
 * @description Provides standard CRUD operations and advanced querying capabilities
 * for PostgreSQL entities using TypeORM.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserRepository extends BasePostgresRepository<User> {
 *   constructor(postgresService: PostgresService) {
 *     super(postgresService, 'main', User);
 *   }
 *
 *   // Add custom methods
 *   async findByEmail(email: string): Promise<User | null> {
 *     return this.findOne(null, {
 *       filter: [{ field: 'email', operator: 'eq', value: email }]
 *     });
 *   }
 * }
 * ```
 */
export class BasePostgresRepository<T> implements IBaseRepository<T> {
  /** TypeORM repository instance */
  protected repository: Repository<T>;

  /** Name of the database connection */
  protected connectionName: string;

  /** Entity class or schema */
  protected entity: EntityTarget<T>;

  /**
   * Creates an instance of BasePostgresRepository
   * @param postgresService - PostgreSQL service instance
   * @param connectionName - Name of the database connection to use
   * @param entity - Entity class or schema
   */
  constructor(
    private readonly postgresService: PostgresService,
    connectionName: string,
    entity: EntityTarget<T>
  ) {
    this.connectionName = connectionName;
    this.entity = entity;
    this.repository = this.postgresService.getRepository(
      connectionName,
      entity
    );
  }

  /**
   * Find a single record by ID
   * @param id - Record ID to find
   * @param options - Query options for filtering, selecting fields, and populating relations
   * @returns Promise resolving to the entity or null if not found
   * @example
   * ```typescript
   * const user = await userRepo.findOne(123, {
   *   select: ['id', 'name', 'email'],
   *   populate: [{ path: 'profile' }]
   * });
   * ```
   */
  async findOne(
    id: string | number,
    options?: QueryOptions
  ): Promise<T | null> {
    const queryBuilder = this.repository.createQueryBuilder('entity');
    queryBuilder.where('entity.id = :id', { id });

    if (options?.select?.length) {
      queryBuilder.select(options.select.map((field) => `entity.${field}`));
    }

    if (options?.populate?.length) {
      options.populate.forEach((pop) => {
        queryBuilder.leftJoinAndSelect(`entity.${pop.path}`, pop.path);
      });
    }

    const result = await queryBuilder.getOne();
    return result;
  }

  /**
   * Find many records with pagination
   */
  async findMany(options?: QueryOptions): Promise<PaginationResult<T>> {
    return this.postgresService.find(this.connectionName, this.entity, options);
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>, options?: QueryOptions): Promise<T> {
    return this.postgresService.create(
      this.connectionName,
      this.entity,
      data,
      options
    );
  }

  /**
   * Create many records
   */
  async createMany(
    data: Partial<T>[],
    options?: BulkOperationOptions
  ): Promise<BulkWriteResult> {
    return this.postgresService.createMany(
      this.connectionName,
      this.entity,
      data,
      options as QueryOptions
    );
  }

  /**
   * Update a record
   */
  async update(
    id: string | number,
    data: Partial<T>,
    options?: QueryOptions
  ): Promise<T> {
    return this.postgresService.update(
      this.connectionName,
      this.entity,
      id,
      data,
      options
    );
  }

  /**
   * Update many records
   */
  async updateMany(
    filter: FilterOptions[],
    data: Partial<T>,
    options?: QueryOptions
  ): Promise<number> {
    return this.postgresService.updateMany(
      this.connectionName,
      this.entity,
      filter,
      data,
      options
    );
  }

  /**
   * Delete a record
   */
  async delete(id: string | number, options?: QueryOptions): Promise<boolean> {
    return this.postgresService.delete(
      this.connectionName,
      this.entity,
      id,
      options
    );
  }

  /**
   * Delete many records
   */
  async deleteMany(
    filter: FilterOptions[],
    options?: QueryOptions
  ): Promise<number> {
    return this.postgresService.deleteMany(
      this.connectionName,
      this.entity,
      filter,
      options
    );
  }

  /**
   * Count records
   */
  async count(
    filter?: FilterOptions[],
    options?: QueryOptions
  ): Promise<number> {
    return this.postgresService.count(
      this.connectionName,
      this.entity,
      filter,
      options
    );
  }

  /**
   * Check if records exist
   */
  async exists(
    filter: FilterOptions[],
    options?: QueryOptions
  ): Promise<boolean> {
    const count = await this.count(filter, options);
    return count > 0;
  }

  /**
   * Perform aggregation
   */
  async aggregate(options: AggregationOptions): Promise<AggregationResult> {
    return this.postgresService.aggregate(
      this.connectionName,
      this.entity,
      options
    );
  }

  /**
   * Search records
   */
  async search(
    searchOptions: SearchOptions,
    queryOptions?: QueryOptions
  ): Promise<PaginationResult<T>> {
    const options: QueryOptions = {
      ...queryOptions,
      search: searchOptions,
    };
    return this.findMany(options);
  }

  /**
   * Execute in transaction
   */
  async transaction<R>(
    fn: (queryRunner: QueryRunner) => Promise<R>,
    options?: TransactionOptions
  ): Promise<R> {
    return this.postgresService.transaction(this.connectionName, fn, options);
  }

  /**
   * Find or create a record
   */
  async findOrCreate(
    filter: FilterOptions[],
    data: Partial<T>,
    options?: QueryOptions
  ): Promise<{ entity: T; created: boolean }> {
    const existing = await this.findMany({ filter, limit: 1 });

    if (existing.data.length > 0) {
      return { entity: existing.data[0], created: false };
    }

    const entity = await this.create(data, options);
    return { entity, created: true };
  }

  /**
   * Upsert a record
   */
  async upsert(
    filter: FilterOptions[],
    data: Partial<T>,
    options?: QueryOptions
  ): Promise<T> {
    const existing = await this.findMany({ filter, limit: 1 });

    if (existing.data.length > 0) {
      const id = (existing.data[0] as any).id;
      return this.update(id, data, options);
    }

    return this.create(data, options);
  }

  /**
   * Bulk upsert records
   */
  async bulkUpsert(
    records: Array<{ filter: FilterOptions[]; data: Partial<T> }>,
    options?: QueryOptions
  ): Promise<BulkWriteResult> {
    let insertedCount = 0;
    let updatedCount = 0;
    const errors: Array<{ index: number; error: Error; document?: any }> = [];

    for (let i = 0; i < records.length; i++) {
      try {
        const { filter, data } = records[i];
        const existing = await this.findMany({ filter, limit: 1 });

        if (existing.data.length > 0) {
          const id = (existing.data[0] as any).id;
          await this.update(id, data, options);
          updatedCount++;
        } else {
          await this.create(data, options);
          insertedCount++;
        }
      } catch (error) {
        errors.push({
          index: i,
          error: error as Error,
          document: records[i],
        });
      }
    }

    return {
      insertedCount,
      updatedCount,
      deletedCount: 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Soft delete a record (if supported)
   */
  async softDelete(
    id: string | number,
    options?: QueryOptions
  ): Promise<boolean> {
    const data = { deletedAt: new Date() } as any;
    const result = await this.update(id, data, options);
    return result !== null;
  }

  /**
   * Restore a soft-deleted record
   */
  async restore(
    id: string | number,
    options?: QueryOptions
  ): Promise<T | null> {
    const data = { deletedAt: null } as any;
    return this.update(id, data, options);
  }

  /**
   * Execute raw SQL query
   */
  async raw(query: string, parameters?: any[]): Promise<any> {
    return this.postgresService.executeRawQuery(
      this.connectionName,
      query,
      parameters
    );
  }

  /**
   * Get query builder for advanced queries
   */
  getQueryBuilder(alias = 'entity') {
    return this.repository.createQueryBuilder(alias);
  }

  /**
   * Batch process records
   */
  async batchProcess<R>(
    filter: FilterOptions[],
    batchSize: number,
    processor: (batch: T[]) => Promise<R>,
    options?: QueryOptions
  ): Promise<R[]> {
    const results: R[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.findMany({
        ...options,
        filter,
        page,
        limit: batchSize,
      });

      if (batch.data.length > 0) {
        const result = await processor(batch.data);
        results.push(result);
      }

      hasMore = batch.pagination.hasNext;
      page++;
    }

    return results;
  }

  /**
   * Stream records for processing large datasets
   */
  async *stream(
    filter?: FilterOptions[],
    options?: QueryOptions
  ): AsyncGenerator<T, void, unknown> {
    const batchSize = options?.limit || 100;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.findMany({
        ...options,
        filter,
        page,
        limit: batchSize,
      });

      for (const item of batch.data) {
        yield item;
      }

      hasMore = batch.pagination.hasNext;
      page++;
    }
  }

  /**
   * Get distinct values for a field
   */
  async distinct(field: string, filter?: FilterOptions[]): Promise<any[]> {
    const queryBuilder = this.repository.createQueryBuilder('entity');

    if (filter?.length) {
      filter.forEach((f, index) => {
        const paramName = `filter_${index}`;
        queryBuilder.andWhere(`entity.${f.field} = :${paramName}`, {
          [paramName]: f.value,
        });
      });
    }

    queryBuilder.select(`DISTINCT entity.${field}`, field);

    const results = await queryBuilder.getRawMany();
    return results.map((r) => r[field]);
  }

  /**
   * Increment a numeric field
   */
  async increment(
    id: string | number,
    field: string,
    value = 1,
    options?: QueryOptions
  ): Promise<T | null> {
    await this.repository.increment({ id } as any, field, value);
    return this.findOne(id, options);
  }

  /**
   * Decrement a numeric field
   */
  async decrement(
    id: string | number,
    field: string,
    value = 1,
    options?: QueryOptions
  ): Promise<T | null> {
    await this.repository.decrement({ id } as any, field, value);
    return this.findOne(id, options);
  }
}
