/**
 * @fileoverview Base repository implementation for PostgreSQL entities
 * @module database/repositories
 * @description Provides a reusable repository pattern for PostgreSQL entities with
 * TypeORM integration. Implements advanced querying, pagination, filtering, transactions,
 * and bulk operations.
 */

import { Repository, EntityTarget, QueryRunner, ObjectLiteral } from 'typeorm';
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
export class BasePostgresRepository<
  T extends ObjectLiteral,
> implements IBaseRepository<T> {
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
    entity: EntityTarget<T>,
  ) {
    this.connectionName = connectionName;
    this.entity = entity;
    this.repository = this.postgresService.getRepository(
      connectionName,
      entity,
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
    options?: QueryOptions,
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
   * Find many records with advanced filtering, sorting, pagination, and search.
   *
   * Delegates to {@link PostgresService.find} which builds a TypeORM query
   * from the provided options.
   *
   * @param options - Query options (filter, sort, page, limit, search, select, populate).
   * @returns Paginated result containing `data`, `pagination` metadata, and `meta`.
   */
  async findMany(options?: QueryOptions): Promise<PaginationResult<T>> {
    return this.postgresService.find(this.connectionName, this.entity, options);
  }

  /**
   * Create and persist a new entity.
   *
   * @param data - Partial entity data.
   * @param options - Optional query options (e.g. `transaction`).
   * @returns The newly created entity.
   */
  async create(data: Partial<T>, options?: QueryOptions): Promise<T> {
    return this.postgresService.create(
      this.connectionName,
      this.entity,
      data,
      options,
    );
  }

  /**
   * Bulk-insert multiple entities.
   *
   * @param data - Array of partial entity data.
   * @param options - Optional bulk operation options.
   * @returns A {@link BulkWriteResult} with counts and any errors.
   */
  async createMany(
    data: Partial<T>[],
    options?: BulkOperationOptions,
  ): Promise<BulkWriteResult> {
    return this.postgresService.createMany(
      this.connectionName,
      this.entity,
      data,
      options as QueryOptions,
    );
  }

  /**
   * Update an existing entity by ID.
   *
   * @param id - Entity ID.
   * @param data - Partial update payload.
   * @param options - Optional query options (e.g. `transaction`).
   * @returns The updated entity.
   */
  async update(
    id: string | number,
    data: Partial<T>,
    options?: QueryOptions,
  ): Promise<T> {
    return this.postgresService.update(
      this.connectionName,
      this.entity,
      id,
      data,
      options,
    );
  }

  /**
   * Update all entities matching the given filters.
   *
   * @param filter - Array of filter conditions.
   * @param data - Partial update payload.
   * @param _options - Reserved for future use.
   * @returns Number of entities updated.
   */
  async updateMany(
    filter: FilterOptions[],
    data: Partial<T>,
    _options?: QueryOptions,
  ): Promise<number> {
    return this.postgresService.updateMany(
      this.connectionName,
      this.entity,
      filter,
      data,
    );
  }

  /**
   * Delete a single entity by ID.
   *
   * @param id - Entity ID.
   * @param options - Optional query options (e.g. `transaction`).
   * @returns `true` if the entity was deleted.
   */
  async delete(id: string | number, options?: QueryOptions): Promise<boolean> {
    return this.postgresService.delete(
      this.connectionName,
      this.entity,
      id,
      options,
    );
  }

  /**
   * Delete all entities matching the given filters.
   *
   * @param filter - Array of filter conditions.
   * @param _options - Reserved for future use.
   * @returns Number of entities deleted.
   */
  async deleteMany(
    filter: FilterOptions[],
    _options?: QueryOptions,
  ): Promise<number> {
    return this.postgresService.deleteMany(
      this.connectionName,
      this.entity,
      filter,
    );
  }

  /**
   * Count entities matching optional filters.
   *
   * @param filter - Optional array of filter conditions.
   * @param _options - Reserved for future use.
   * @returns The total count.
   */
  async count(
    filter?: FilterOptions[],
    _options?: QueryOptions,
  ): Promise<number> {
    return this.postgresService.count(this.connectionName, this.entity, filter);
  }

  /**
   * Check whether at least one entity matches the given filters.
   *
   * @param filter - Array of filter conditions.
   * @param options - Optional query options.
   * @returns `true` if one or more matching entities exist.
   */
  async exists(
    filter: FilterOptions[],
    options?: QueryOptions,
  ): Promise<boolean> {
    const count = await this.count(filter, options);
    return count > 0;
  }

  /**
   * Perform an aggregation query (groupBy, sum, avg, min, max, count).
   *
   * @param options - Aggregation configuration.
   * @returns An {@link AggregationResult} with grouped data and execution time.
   */
  async aggregate(options: AggregationOptions): Promise<AggregationResult> {
    return this.postgresService.aggregate(
      this.connectionName,
      this.entity,
      options,
    );
  }

  /**
   * Search entities using full-text or field-based search.
   *
   * Merges `searchOptions` into `queryOptions.search` and delegates to
   * {@link findMany}.
   *
   * @param searchOptions - Search query, fields, and options.
   * @param queryOptions - Additional query options (sort, pagination, etc.).
   * @returns Paginated search results.
   */
  async search(
    searchOptions: SearchOptions,
    queryOptions?: QueryOptions,
  ): Promise<PaginationResult<T>> {
    const options: QueryOptions = {
      ...queryOptions,
      search: searchOptions,
    };
    return this.findMany(options);
  }

  /**
   * Execute a callback within a database transaction.
   *
   * @typeParam R - Return type of the transaction callback.
   * @param fn - Async function receiving a TypeORM `QueryRunner`.
   * @param options - Optional transaction options (e.g. isolation level).
   * @returns The value returned by `fn`.
   */
  async transaction<R>(
    fn: (queryRunner: QueryRunner) => Promise<R>,
    options?: TransactionOptions,
  ): Promise<R> {
    return this.postgresService.transaction(this.connectionName, fn, options);
  }

  /**
   * Find an existing entity or create a new one if none matches.
   *
   * @param filter - Filter conditions to locate an existing entity.
   * @param data - Data to use if a new entity must be created.
   * @param options - Optional query options.
   * @returns An object with the `entity` and a `created` flag.
   */
  async findOrCreate(
    filter: FilterOptions[],
    data: Partial<T>,
    options?: QueryOptions,
  ): Promise<{ entity: T; created: boolean }> {
    const existing = await this.findMany({ filter, limit: 1 });

    if (existing.data.length > 0) {
      return { entity: existing.data[0], created: false };
    }

    const entity = await this.create(data, options);
    return { entity, created: true };
  }

  /**
   * Upsert (update-or-insert) an entity.
   *
   * If a matching entity exists it is updated; otherwise a new one is created.
   *
   * @param filter - Filter conditions to locate an existing entity.
   * @param data - Data to upsert.
   * @param options - Optional query options.
   * @returns The upserted entity.
   */
  async upsert(
    filter: FilterOptions[],
    data: Partial<T>,
    options?: QueryOptions,
  ): Promise<T> {
    const existing = await this.findMany({ filter, limit: 1 });

    if (existing.data.length > 0) {
      const id = (existing.data[0] as any).id;
      return this.update(id, data, options);
    }

    return this.create(data, options);
  }

  /**
   * Bulk upsert an array of records.
   *
   * Each record is individually looked up and either updated or created.
   * Errors are collected per-record rather than aborting the entire batch.
   *
   * @param records - Array of `{ filter, data }` pairs.
   * @param options - Optional query options.
   * @returns A {@link BulkWriteResult} with insert/update counts and errors.
   */
  async bulkUpsert(
    records: Array<{ filter: FilterOptions[]; data: Partial<T> }>,
    options?: QueryOptions,
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
   * Soft-delete an entity by setting its `deletedAt` timestamp.
   *
   * @param id - Entity ID.
   * @param options - Optional query options.
   * @returns `true` if the entity was found and soft-deleted.
   */
  async softDelete(
    id: string | number,
    options?: QueryOptions,
  ): Promise<boolean> {
    const data = { deletedAt: new Date() } as any;
    const result = await this.update(id, data, options);
    return result !== null;
  }

  /**
   * Restore a soft-deleted entity by clearing its `deletedAt` field.
   *
   * @param id - Entity ID.
   * @param options - Optional query options.
   * @returns The restored entity, or `null` if not found.
   */
  async restore(
    id: string | number,
    options?: QueryOptions,
  ): Promise<T | null> {
    const data = { deletedAt: null } as any;
    return this.update(id, data, options);
  }

  /**
   * Execute a raw SQL query against the connection.
   *
   * @param query - The SQL query string.
   * @param parameters - Optional positional parameters.
   * @returns The raw query result.
   */
  async raw(query: string, parameters?: any[]): Promise<any> {
    return this.postgresService.executeRawQuery(
      this.connectionName,
      query,
      parameters,
    );
  }

  /**
   * Get a TypeORM `SelectQueryBuilder` for advanced custom queries.
   *
   * @param alias - Table alias (default `'entity'`).
   * @returns A `SelectQueryBuilder` instance.
   */
  getQueryBuilder(alias = 'entity') {
    return this.repository.createQueryBuilder(alias);
  }

  /**
   * Process entities in batches using pagination.
   *
   * Iterates through all matching entities page-by-page and invokes
   * `processor` for each batch.
   *
   * @typeParam R - Return type of each batch processor invocation.
   * @param filter - Filter conditions to select entities.
   * @param batchSize - Number of entities per batch.
   * @param processor - Async callback invoked with each batch.
   * @param options - Optional additional query options.
   * @returns Array of results from each batch processor call.
   */
  async batchProcess<R>(
    filter: FilterOptions[],
    batchSize: number,
    processor: (batch: T[]) => Promise<R>,
    options?: QueryOptions,
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
   * Stream entities one-by-one via an async generator.
   *
   * Internally paginates in batches and yields individual entities,
   * which is memory-efficient for large result sets.
   *
   * @param filter - Optional filter conditions.
   * @param options - Optional query options (`limit` controls batch size).
   * @yields Individual entities of type `T`.
   */
  async *stream(
    filter?: FilterOptions[],
    options?: QueryOptions,
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
   * Get distinct values for a specific column.
   *
   * @param field - Column name to select distinct values from.
   * @param filter - Optional filter conditions.
   * @returns Array of distinct values.
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
   * Atomically increment a numeric column.
   *
   * @param id - Entity ID.
   * @param field - Column name to increment.
   * @param value - Amount to add (default `1`).
   * @param options - Optional query options for re-fetching the entity.
   * @returns The updated entity, or `null` if not found.
   */
  async increment(
    id: string | number,
    field: string,
    value = 1,
    options?: QueryOptions,
  ): Promise<T | null> {
    await this.repository.increment({ id } as any, field, value);
    return this.findOne(id, options);
  }

  /**
   * Atomically decrement a numeric column.
   *
   * @param id - Entity ID.
   * @param field - Column name to decrement.
   * @param value - Amount to subtract (default `1`).
   * @param options - Optional query options for re-fetching the entity.
   * @returns The updated entity, or `null` if not found.
   */
  async decrement(
    id: string | number,
    field: string,
    value = 1,
    options?: QueryOptions,
  ): Promise<T | null> {
    await this.repository.decrement({ id } as any, field, value);
    return this.findOne(id, options);
  }
}
