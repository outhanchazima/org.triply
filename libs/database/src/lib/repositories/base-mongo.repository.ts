/**
 * @fileoverview Base repository implementation for MongoDB documents
 * @module database/repositories
 * @description Provides a reusable repository pattern for MongoDB documents
 * using Mongoose. Implements the same {@link IBaseRepository} interface as
 * the PostgreSQL counterpart, plus MongoDB-specific helpers for aggregation
 * pipelines, array operations, text indexes, and compound indexes.
 *
 * @author Outhan Chazima
 * @version 1.0.0
 */

import { Model, Document, ClientSession, Schema } from 'mongoose';
import { QueryRunner } from 'typeorm';
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
import { MongoService } from '../services/mongo.service';
import { PipelineBuilder } from '../utils/pipeline.builder';

/**
 * Base repository class for MongoDB documents.
 *
 * @class BaseMongoRepository
 * @template T - Mongoose Document type.
 * @implements {IBaseRepository<T>}
 * @description Wraps {@link MongoService} to provide standard CRUD,
 * aggregation, search, transactions, bulk operations, streaming,
 * and MongoDB-specific array/index utilities.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class TripRepository extends BaseMongoRepository<TripDocument> {
 *   constructor(mongoService: MongoService) {
 *     super(mongoService, 'main', 'Trip', TripSchema);
 *   }
 * }
 * ```
 */
export class BaseMongoRepository<
  T extends Document,
> implements IBaseRepository<T> {
  /** Mongoose Model bound to this repository */
  protected model: Model<T>;

  /** Name of the MongoDB connection */
  protected connectionName: string;

  /** Collection / model name */
  protected modelName: string;

  /**
   * Creates an instance of BaseMongoRepository.
   *
   * @param mongoService - MongoDB service instance.
   * @param connectionName - Name of the database connection.
   * @param modelName - Collection / model name.
   * @param schema - Optional Mongoose schema (a dynamic schema is used if omitted).
   */
  constructor(
    private readonly mongoService: MongoService,
    connectionName: string,
    modelName: string,
    schema?: Schema,
  ) {
    this.connectionName = connectionName;
    this.modelName = modelName;
    this.model = this.mongoService.getModel<T>(
      connectionName,
      modelName,
      schema,
    );
  }

  /**
   * Find a single document by its `_id`.
   *
   * @param id - Document ID.
   * @param options - Optional query options (select, populate).
   * @returns The matched document, or `null`.
   */
  async findOne(
    id: string | number,
    options?: QueryOptions,
  ): Promise<T | null> {
    const filter: FilterOptions[] = [
      { field: '_id', operator: 'eq', value: id },
    ];
    return this.mongoService.findOne(
      this.connectionName,
      this.modelName,
      filter,
      options,
    );
  }

  /**
   * Find many documents with filtering, sorting, and pagination.
   *
   * @param options - Query options.
   * @returns Paginated result.
   */
  async findMany(options?: QueryOptions): Promise<PaginationResult<T>> {
    return this.mongoService.find(this.connectionName, this.modelName, options);
  }

  /**
   * Create and persist a new document.
   *
   * @param data - Partial document data.
   * @param options - Optional query options (e.g. `transaction`).
   * @returns The newly created document.
   */
  async create(data: Partial<T>, options?: QueryOptions): Promise<T> {
    return this.mongoService.create(
      this.connectionName,
      this.modelName,
      data,
      options,
    );
  }

  /**
   * Bulk-insert multiple documents.
   *
   * @param data - Array of partial document data.
   * @param options - Optional bulk operation options.
   * @returns A {@link BulkWriteResult} with counts and any errors.
   */
  async createMany(
    data: Partial<T>[],
    options?: BulkOperationOptions,
  ): Promise<BulkWriteResult> {
    return this.mongoService.createMany(
      this.connectionName,
      this.modelName,
      data,
      options as QueryOptions,
    );
  }

  /**
   * Update a document by ID.
   *
   * @param id - Document ID.
   * @param data - Partial update payload.
   * @param options - Optional query options.
   * @returns The updated document.
   * @throws Error if the document is not found.
   */
  async update(
    id: string | number,
    data: Partial<T>,
    options?: QueryOptions,
  ): Promise<T> {
    const result = await this.mongoService.update(
      this.connectionName,
      this.modelName,
      String(id),
      data,
      options,
    );
    if (!result) {
      throw new Error(`Record with id ${id} not found`);
    }
    return result;
  }

  /**
   * Update all documents matching the given filters.
   *
   * @param filter - Array of filter conditions.
   * @param data - Partial update payload.
   * @param options - Optional query options.
   * @returns Number of documents modified.
   */
  async updateMany(
    filter: FilterOptions[],
    data: Partial<T>,
    options?: QueryOptions,
  ): Promise<number> {
    return this.mongoService.updateMany(
      this.connectionName,
      this.modelName,
      filter,
      data,
      options,
    );
  }

  /**
   * Delete a single document by ID.
   *
   * @param id - Document ID.
   * @param options - Optional query options.
   * @returns `true` if the document was found and deleted.
   */
  async delete(id: string | number, options?: QueryOptions): Promise<boolean> {
    return this.mongoService.delete(
      this.connectionName,
      this.modelName,
      String(id),
      options,
    );
  }

  /**
   * Delete all documents matching the given filters.
   *
   * @param filter - Array of filter conditions.
   * @param options - Optional query options.
   * @returns Number of documents deleted.
   */
  async deleteMany(
    filter: FilterOptions[],
    options?: QueryOptions,
  ): Promise<number> {
    return this.mongoService.deleteMany(
      this.connectionName,
      this.modelName,
      filter,
      options,
    );
  }

  /**
   * Count documents matching optional filters.
   *
   * @param filter - Optional filter conditions.
   * @param _options - Reserved for future use.
   * @returns The total count.
   */
  async count(
    filter?: FilterOptions[],
    _options?: QueryOptions,
  ): Promise<number> {
    return this.mongoService.count(this.connectionName, this.modelName, filter);
  }

  /**
   * Check whether at least one document matches the given filters.
   *
   * @param filter - Array of filter conditions.
   * @param _options - Reserved for future use.
   * @returns `true` if one or more matching documents exist.
   */
  async exists(
    filter: FilterOptions[],
    _options?: QueryOptions,
  ): Promise<boolean> {
    return this.mongoService.exists(
      this.connectionName,
      this.modelName,
      filter,
    );
  }

  /**
   * Perform a structured aggregation (groupBy, sum, avg, etc.).
   *
   * @param options - Aggregation configuration.
   * @returns An {@link AggregationResult} with grouped data.
   */
  async aggregate(options: AggregationOptions): Promise<AggregationResult> {
    return this.mongoService.aggregate(
      this.connectionName,
      this.modelName,
      options,
    );
  }

  /**
   * Perform a full-text search with relevance scoring.
   *
   * @param searchOptions - Search query, fields, and options.
   * @param queryOptions - Additional query options.
   * @returns Paginated search results.
   */
  async search(
    searchOptions: SearchOptions,
    queryOptions?: QueryOptions,
  ): Promise<PaginationResult<T>> {
    return this.mongoService.search(
      this.connectionName,
      this.modelName,
      searchOptions,
      queryOptions,
    );
  }

  /**
   * Execute a callback within a MongoDB transaction.
   *
   * Wraps the Mongoose `ClientSession` in a mock `QueryRunner` so
   * the {@link IBaseRepository} interface is satisfied.
   *
   * @typeParam R - Return type of the transaction callback.
   * @param fn - Async function receiving a (mock) `QueryRunner`.
   * @param options - Optional transaction options.
   * @returns The value returned by `fn`.
   */
  async transaction<R>(
    fn: (queryRunner: QueryRunner) => Promise<R>,
    options?: TransactionOptions,
  ): Promise<R> {
    // Convert QueryRunner interface to ClientSession for MongoDB
    const sessionFn = async (session: ClientSession) => {
      // Create a mock QueryRunner that wraps the session
      const mockQueryRunner = {
        manager: {
          transaction: session,
        },
      } as unknown as QueryRunner;
      return fn(mockQueryRunner);
    };

    return this.mongoService.transaction(
      this.connectionName,
      sessionFn,
      options,
    );
  }

  /**
   * Find an existing document or create a new one if none matches.
   *
   * @param filter - Filter conditions to locate an existing document.
   * @param data - Data to use for creation if no match found.
   * @param options - Optional query options.
   * @returns An object with the `entity` and a `created` flag.
   */
  async findOrCreate(
    filter: FilterOptions[],
    data: Partial<T>,
    options?: QueryOptions,
  ): Promise<{ entity: T; created: boolean }> {
    const existing = await this.mongoService.findOne(
      this.connectionName,
      this.modelName,
      filter,
      options,
    );

    if (existing) {
      return { entity: existing as T, created: false };
    }

    const entity = await this.create(data, options);
    return { entity, created: true };
  }

  /**
   * Upsert (update-or-insert) a document.
   *
   * @param filter - Filter conditions to locate an existing document.
   * @param data - Data to upsert.
   * @param options - Optional query options.
   * @returns The upserted document.
   */
  async upsert(
    filter: FilterOptions[],
    data: Partial<T>,
    options?: QueryOptions,
  ): Promise<T> {
    const existing = await this.mongoService.findOne(
      this.connectionName,
      this.modelName,
      filter,
      options,
    );

    if (existing) {
      const id = String(existing._id || (existing as any).id);
      return this.update(id, data, options);
    }

    return this.create(data, options);
  }

  /**
   * Bulk upsert an array of records.
   *
   * Each record is individually looked up and either updated or created.
   * Errors are collected per-record.
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
        const existing = await this.mongoService.findOne(
          this.connectionName,
          this.modelName,
          filter,
          options,
        );

        if (existing) {
          const id = String(existing._id || (existing as any).id);
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
   * Soft-delete a document by setting its `deletedAt` timestamp.
   *
   * @param id - Document ID.
   * @param options - Optional query options.
   * @returns `true` if the document was found and soft-deleted.
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
   * Restore a soft-deleted document by clearing its `deletedAt` field.
   *
   * @param id - Document ID.
   * @param options - Optional query options.
   * @returns The restored document, or `null` if not found.
   */
  async restore(
    id: string | number,
    options?: QueryOptions,
  ): Promise<T | null> {
    const data = { deletedAt: null } as any;
    return this.update(id, data, options);
  }

  /**
   * Execute a raw MongoDB aggregation pipeline.
   *
   * @param pipeline - Array of MongoDB aggregation stage objects.
   * @returns The raw aggregation result array.
   */
  async aggregatePipeline(pipeline: any[]): Promise<any[]> {
    return this.mongoService.executeAggregation(
      this.connectionName,
      this.modelName,
      pipeline,
    );
  }

  /**
   * Create a fluent pipeline builder bound to this repository.
   *
   * Call `.execute()` on the returned builder to run the pipeline,
   * or `.build()` to get the raw stage array.
   *
   * @example
   * ```ts
   * const results = await repo.pipeline()
   *   .match({ status: 'active' })
   *   .lookup({ from: 'users', localField: 'userId', foreignField: '_id', as: 'user' })
   *   .unwind('$user')
   *   .sort({ createdAt: -1 })
   *   .limit(10)
   *   .execute();
   * ```
   */
  pipeline(): PipelineBuilder & { execute: () => Promise<any[]> } {
    const builder = new PipelineBuilder() as PipelineBuilder & {
      execute: () => Promise<any[]>;
    };
    builder.execute = () =>
      this.mongoService.executeAggregation(
        this.connectionName,
        this.modelName,
        builder.build() as any[],
      );
    return builder;
  }

  /**
   * Get the underlying Mongoose model.
   *
   * @returns The `Model<T>` bound to this repository.
   */
  getModel(): Model<T> {
    return this.model;
  }

  /**
   * Process documents in batches using pagination.
   *
   * @typeParam R - Return type of each batch processor invocation.
   * @param filter - Filter conditions to select documents.
   * @param batchSize - Number of documents per batch.
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
   * Stream documents one-by-one via an async generator.
   *
   * @param filter - Optional filter conditions.
   * @param options - Optional query options (`limit` controls batch size).
   * @yields Individual documents of type `T`.
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
   * Get distinct values for a specific field.
   *
   * @param field - Field name.
   * @param filter - Optional filter conditions.
   * @returns Array of distinct values.
   */
  async distinct(field: string, filter?: FilterOptions[]): Promise<unknown[]> {
    const filterQuery = filter
      ? this.mongoService.buildFilterQuery(filter)
      : {};
    return this.model.distinct(field, filterQuery);
  }

  /**
   * Create a MongoDB text index on the specified fields.
   *
   * Required for `$text` search queries.
   *
   * @param fields - Array of field names to include in the text index.
   */
  async createTextIndex(fields: string[]): Promise<void> {
    const indexSpec = fields.reduce(
      (acc, field) => {
        acc[field] = 'text';
        return acc;
      },
      {} as Record<string, string>,
    );

    await this.model.collection.createIndex(indexSpec as any);
  }

  /**
   * Create a compound index on multiple fields.
   *
   * @param fields - Array of `{ field, order }` pairs.
   * @param options - Optional index options (unique, sparse, background).
   */
  async createCompoundIndex(
    fields: Array<{ field: string; order: 1 | -1 }>,
    options?: { unique?: boolean; sparse?: boolean; background?: boolean },
  ): Promise<void> {
    const indexSpec = fields.reduce(
      (acc, { field, order }) => {
        acc[field] = order;
        return acc;
      },
      {} as Record<string, 1 | -1>,
    );

    await this.model.collection.createIndex(indexSpec, options);
  }

  /**
   * Drop a named index from the collection.
   *
   * @param indexName - The name of the index to drop.
   */
  async dropIndex(indexName: string): Promise<void> {
    await this.model.collection.dropIndex(indexName);
  }

  /**
   * List all indexes on the collection.
   *
   * @returns Array of index specification objects.
   */
  async getIndexes(): Promise<any[]> {
    return this.model.collection.indexes();
  }

  /**
   * Atomically increment a numeric field using `$inc`.
   *
   * @param id - Document ID.
   * @param field - Field name to increment.
   * @param value - Amount to add (default `1`).
   * @param options - Optional query options.
   * @returns The updated document, or `null`.
   */
  async increment(
    id: string | number,
    field: string,
    value = 1,
    options?: QueryOptions,
  ): Promise<T | null> {
    const updateData = { $inc: { [field]: value } } as any;
    return this.model
      .findByIdAndUpdate(id, updateData, { new: true, ...options })
      .lean()
      .exec() as Promise<T | null>;
  }

  /**
   * Atomically decrement a numeric field using `$inc` with a negative value.
   *
   * @param id - Document ID.
   * @param field - Field name to decrement.
   * @param value - Amount to subtract (default `1`).
   * @param options - Optional query options.
   * @returns The updated document, or `null`.
   */
  async decrement(
    id: string | number,
    field: string,
    value = 1,
    options?: QueryOptions,
  ): Promise<T | null> {
    return this.increment(id, field, -value, options);
  }

  /**
   * Push one or more values onto an array field using `$push`.
   *
   * When `value` is an array, uses `$each` to push all elements.
   *
   * @param id - Document ID.
   * @param field - Array field name.
   * @param value - Value(s) to push.
   * @param options - Optional query options.
   * @returns The updated document, or `null`.
   */
  async push(
    id: string | number,
    field: string,
    value: any | any[],
    options?: QueryOptions,
  ): Promise<T | null> {
    const updateData = Array.isArray(value)
      ? { $push: { [field]: { $each: value } } }
      : { $push: { [field]: value } };

    return this.model
      .findByIdAndUpdate(id, updateData as any, { new: true, ...options })
      .lean()
      .exec() as Promise<T | null>;
  }

  /**
   * Remove one or more values from an array field using `$pull`.
   *
   * When `value` is an array, uses `$in` to match any of the values.
   *
   * @param id - Document ID.
   * @param field - Array field name.
   * @param value - Value(s) to remove.
   * @param options - Optional query options.
   * @returns The updated document, or `null`.
   */
  async pull(
    id: string | number,
    field: string,
    value: any | any[],
    options?: QueryOptions,
  ): Promise<T | null> {
    const updateData = Array.isArray(value)
      ? { $pull: { [field]: { $in: value } } }
      : { $pull: { [field]: value } };

    return this.model
      .findByIdAndUpdate(id, updateData as any, { new: true, ...options })
      .lean()
      .exec() as Promise<T | null>;
  }

  /**
   * Add values to an array field only if not already present (`$addToSet`).
   *
   * When `value` is an array, uses `$each` to add each element uniquely.
   *
   * @param id - Document ID.
   * @param field - Array field name.
   * @param value - Value(s) to add.
   * @param options - Optional query options.
   * @returns The updated document, or `null`.
   */
  async addToSet(
    id: string | number,
    field: string,
    value: any | any[],
    options?: QueryOptions,
  ): Promise<T | null> {
    const updateData = Array.isArray(value)
      ? { $addToSet: { [field]: { $each: value } } }
      : { $addToSet: { [field]: value } };

    return this.model
      .findByIdAndUpdate(id, updateData as any, { new: true, ...options })
      .lean()
      .exec() as Promise<T | null>;
  }
}
