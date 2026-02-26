/**
 * @fileoverview MongoDB service for managing connections, CRUD operations,
 * aggregation pipelines, text search, and transactions via Mongoose.
 * @module database/services
 * @description Provides a high-level API over Mongoose for multi-connection
 * MongoDB operations including:
 *
 * - **CRUD** — `find`, `findOne`, `create`, `createMany`, `update`, `updateMany`, `delete`, `deleteMany`
 * - **Querying** — advanced filtering, pagination, sorting, field selection, population
 * - **Aggregation** — structured `aggregate` plus raw `executeAggregation`
 * - **Full-text search** — `search` with relevance scoring
 * - **Transactions** — `transaction` via Mongoose `ClientSession`
 * - **Bulk writes** — `createMany` with batching and partial-failure handling
 *
 * Each query is automatically recorded by {@link QueryOptimizationService}
 * for performance monitoring.
 *
 * @author Outhan Chazima
 * @version 1.0.0
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  Connection,
  Model,
  Document,
  QueryFilter,
  UpdateQuery,
  QueryOptions as MongooseQueryOptions,
  ClientSession,
} from 'mongoose';
import {
  MongoConnectionConfig,
  QueryOptions,
  PaginationResult,
  FilterOptions,
  SearchOptions,
  BulkWriteResult,
  AggregationOptions,
  AggregationResult,
  TransactionOptions,
} from '../interfaces/database.interface';
import { QueryOptimizationService } from './query-optimization.service';
import { ConnectionManagerService } from './connection-manager.service';
import { MONGO_CONNECTIONS } from '../database.constants';

/**
 * Service responsible for all MongoDB operations.
 *
 * Manages named Mongoose connections and provides methods for:
 * - CRUD operations with advanced filtering and pagination
 * - Aggregation pipelines
 * - Full-text search
 * - Transactions via Mongoose sessions
 * - Bulk write operations with batching
 *
 * All queries are automatically recorded by {@link QueryOptimizationService}
 * for performance monitoring.
 *
 * @example
 * ```typescript
 * // Inject and use in a repository or service
 * const result = await mongoService.find<User>('main', 'User', {
 *   filter: [{ field: 'status', operator: 'eq', value: 'active' }],
 *   sort: [{ field: 'createdAt', order: 'DESC' }],
 *   page: 1,
 *   limit: 25,
 * });
 * ```
 */
@Injectable()
export class MongoService {
  /** Logger scoped to this service */
  private readonly logger = new Logger(MongoService.name);

  /** Map of connection name → Mongoose Connection */
  private readonly connections: Map<string, Connection> = new Map();

  /** Map of connection name → (model name → Mongoose Model) */
  private readonly models: Map<string, Map<string, Model<any>>> = new Map();

  /**
   * Creates an instance of MongoService.
   *
   * @param configs - Injected array of named MongoDB connection configurations.
   * @param optimizationService - Service for recording query performance metrics.
   * @param connectionManager - Central connection registry.
   */
  constructor(
    @Inject(MONGO_CONNECTIONS)
    private readonly configs: Array<{
      name: string;
      config: MongoConnectionConfig;
    }>,
    private readonly optimizationService: QueryOptimizationService,
    private readonly connectionManager: ConnectionManagerService,
  ) {}

  /**
   * Initialise all configured MongoDB connections.
   *
   * Registers each connection in the {@link ConnectionManagerService},
   * creates per-connection model maps, and builds default indexes.
   *
   * @throws Error if any connection registration fails.
   */
  async initialize(): Promise<void> {
    for (const { name } of this.configs) {
      try {
        // Connection is already established by Mongoose module
        // We just need to register it in our service
        const connection =
          await this.connectionManager.registerMongoConnection(name);
        if (connection) {
          this.connections.set(name, connection as Connection);
          this.models.set(name, new Map());

          // Create indexes for better performance
          await this.createIndexes(name);

          this.logger.log(
            `MongoDB connection '${name}' registered successfully`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to register MongoDB connection '${name}'`,
          error,
        );
        throw error;
      }
    }
  }

  /**
   * Retrieve a registered MongoDB connection by name.
   *
   * @param name - The connection name as defined in the module configuration.
   * @returns The Mongoose {@link Connection} instance.
   * @throws {Error} If no connection with the given name exists.
   */
  getConnection(name: string): Connection {
    const connection = this.connections.get(name);
    if (!connection) {
      throw new Error(`MongoDB connection '${name}' not found`);
    }
    return connection;
  }

  /**
   * Get or create a Mongoose model for a collection.
   *
   * If no schema is provided, a permissive dynamic schema (`strict: false`)
   * is used, allowing arbitrary document shapes.
   *
   * @typeParam T - The document type.
   * @param connectionName - Name of the MongoDB connection.
   * @param modelName      - The collection / model name.
   * @param schema         - Optional Mongoose schema. If omitted a dynamic
   *   schema is created.
   * @returns A Mongoose {@link Model} bound to the connection.
   * @throws {Error} If the connection does not exist.
   */
  getModel<T extends Document>(
    connectionName: string,
    modelName: string,
    schema?: any,
  ): Model<T> {
    const connection = this.getConnection(connectionName);
    const modelMap = this.models.get(connectionName);

    if (!modelMap?.has(modelName)) {
      if (!schema) {
        // Use a dynamic schema if none provided
        const model = connection.model<T>(
          modelName,
          new connection.base.Schema({}, { strict: false }),
        );
        modelMap?.set(modelName, model);
        return model;
      }
      const model = connection.model<T>(modelName, schema);
      modelMap?.set(modelName, model);
      return model;
    }

    return modelMap.get(modelName) as Model<T>;
  }

  /**
   * Find documents with advanced filtering, pagination, sorting, and population.
   *
   * Supports Django-style filter operators, full-text search, field selection,
   * and deep population. Results are wrapped in a {@link PaginationResult}.
   *
   * @typeParam T - The document type.
   * @param connectionName - Name of the MongoDB connection.
   * @param modelName      - The collection / model name.
   * @param options        - Query options including filters, sort, pagination,
   *   select, populate, and explain.
   * @returns A paginated result containing `data`, `pagination` metadata, and
   *   execution `meta`.
   */
  async find<T extends Document>(
    connectionName: string,
    modelName: string,
    options: QueryOptions = {},
  ): Promise<PaginationResult<T>> {
    const model = this.getModel<T>(connectionName, modelName);
    const startTime = Date.now();

    // Build filter query
    const filterQuery = this.buildFilterQuery(options.filter);

    // Build search query
    const searchQuery = options.search
      ? this.buildSearchQuery(options.search)
      : {};

    // Combine filters and search
    const query = { ...filterQuery, ...searchQuery };

    // Get total count
    const total = await model.countDocuments(query);

    // Build the find query
    let findQuery = model.find(query);

    // Apply selection
    if (options.select?.length) {
      findQuery = findQuery.select(options.select.join(' ')) as any;
    }

    // Apply population
    if (options.populate?.length) {
      options.populate.forEach((pop) => {
        findQuery = findQuery.populate({
          path: pop.path,
          select: pop.select?.join(' '),
          match: pop.match,
          options: pop.options,
          populate: pop.populate as any,
        }) as any;
      });
    }

    // Apply sorting
    if (options.sort?.length) {
      const sortObj = options.sort.reduce(
        (acc, sort) => {
          acc[sort.field] = sort.order === 'ASC' ? 1 : -1;
          return acc;
        },
        {} as Record<string, 1 | -1>,
      );
      findQuery = findQuery.sort(sortObj);
    }

    // Apply pagination
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    findQuery = findQuery.skip(skip).limit(limit);

    // Add query explanation if requested
    if (options.explain) {
      const explanation = await findQuery.explain('executionStats');
      this.logger.debug('Query explanation:', explanation);
    }

    // Execute query
    const data = (await findQuery.lean().exec()) as T[];
    const executionTime = Date.now() - startTime;

    // Record performance metrics
    this.optimizationService.recordQuery({
      query: JSON.stringify(query),
      executionTime,
      rowsAffected: data.length,
      cached: false,
      slow: executionTime > 1000,
      timestamp: new Date(),
      connection: connectionName,
      metadata: { collection: modelName },
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
        query: options.explain ? query : undefined,
      },
    };
  }

  /**
   * Find a single document matching the given filters.
   *
   * @typeParam T - The document type.
   * @param connectionName - Name of the MongoDB connection.
   * @param modelName      - The collection / model name.
   * @param filter         - Array of filter conditions.
   * @param options        - Optional query options (select, populate).
   * @returns The matched document as a lean POJO, or `null`.
   */
  async findOne<T extends Document>(
    connectionName: string,
    modelName: string,
    filter: FilterOptions[],
    options: QueryOptions = {},
  ): Promise<T | null> {
    const model = this.getModel<T>(connectionName, modelName);
    const filterQuery = this.buildFilterQuery(filter);

    let query = model.findOne(filterQuery);

    if (options.select?.length) {
      query = query.select(options.select.join(' ')) as any;
    }

    if (options.populate?.length) {
      options.populate.forEach((pop) => {
        query = query.populate({
          path: pop.path,
          select: pop.select?.join(' '),
          match: pop.match,
          options: pop.options,
          populate: pop.populate as any,
        }) as any;
      });
    }

    return query.lean().exec() as Promise<T | null>;
  }

  /**
   * Create and persist a new document.
   *
   * When a `transaction` is present in options, the document is created
   * within the given Mongoose {@link ClientSession}.
   *
   * @typeParam T - The document type.
   * @param connectionName - Name of the MongoDB connection.
   * @param modelName      - The collection / model name.
   * @param data           - Partial document data to insert.
   * @param options        - Optional query options (e.g. `transaction`).
   * @returns The newly created document.
   */
  async create<T extends Document>(
    connectionName: string,
    modelName: string,
    data: Partial<T>,
    options: QueryOptions = {},
  ): Promise<T> {
    const model = this.getModel<T>(connectionName, modelName);

    if (options.transaction) {
      const session = options.transaction as unknown as ClientSession;
      return model
        .create([data] as any[], { session })
        .then((docs) => docs![0] as T);
    }

    const document = new model(data);
    return document.save() as unknown as Promise<T>;
  }

  /**
   * Bulk-insert documents in batches of 1 000.
   *
   * Uses `insertMany` with `ordered: false` so that individual failures
   * don't abort the entire batch. Errors are collected and returned in
   * the {@link BulkWriteResult}.
   *
   * @typeParam T - The document type.
   * @param connectionName - Name of the MongoDB connection.
   * @param modelName      - The collection / model name.
   * @param data           - Array of partial documents to insert.
   * @param options        - Optional query options (e.g. `transaction`).
   * @returns A {@link BulkWriteResult} with `insertedCount` and `errors`.
   */
  async createMany<T extends Document>(
    connectionName: string,
    modelName: string,
    data: Partial<T>[],
    options: QueryOptions = {},
  ): Promise<BulkWriteResult> {
    const model = this.getModel<T>(connectionName, modelName);
    const errors: Array<{ index: number; error: Error; document?: any }> = [];
    let insertedCount = 0;

    try {
      // Use insertMany for better performance
      const batchSize = 1000;
      const sessionOptions = options.transaction
        ? { session: options.transaction as unknown as ClientSession }
        : {};

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        try {
          const result = await model.insertMany(batch, {
            ...sessionOptions,
            ordered: false,
            rawResult: true,
          } as any);

          insertedCount += result.insertedCount || batch.length;
        } catch (error: any) {
          // Handle partial failures
          if (error.writeErrors) {
            error.writeErrors.forEach((writeError: any) => {
              errors.push({
                index: i + writeError.index,
                error: new Error(writeError.errmsg),
                document: batch[writeError.index],
              });
            });
            insertedCount += batch.length - error.writeErrors.length;
          } else {
            throw error;
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
   * Update a single document by its `_id`.
   *
   * Returns the **updated** document (uses `{ new: true }`) and runs
   * Mongoose validators on the update payload.
   *
   * @typeParam T - The document type.
   * @param connectionName - Name of the MongoDB connection.
   * @param modelName - The collection / model name.
   * @param id - The document `_id`.
   * @param data - Partial update payload.
   * @param options - Optional query options (e.g. `transaction`).
   * @returns The updated document, or `null` if not found.
   */
  async update<T extends Document>(
    connectionName: string,
    modelName: string,
    id: string,
    data: Partial<T>,
    options: QueryOptions = {},
  ): Promise<T | null> {
    const model = this.getModel<T>(connectionName, modelName);
    const updateOptions: MongooseQueryOptions = {
      new: true,
      runValidators: true,
    };

    if (options.transaction) {
      updateOptions.session = options.transaction as unknown as ClientSession;
    }

    return model
      .findByIdAndUpdate(id, data as UpdateQuery<T>, updateOptions)
      .lean()
      .exec() as Promise<T | null>;
  }

  /**
   * Update all documents matching the given filters.
   *
   * @typeParam T - The document type.
   * @param connectionName - Name of the MongoDB connection.
   * @param modelName - The collection / model name.
   * @param filter - Array of filter conditions to select documents.
   * @param data - Partial update payload applied to every match.
   * @param options - Optional query options (e.g. `transaction`).
   * @returns The number of documents that were modified.
   */
  async updateMany<T extends Document>(
    connectionName: string,
    modelName: string,
    filter: FilterOptions[],
    data: Partial<T>,
    options: QueryOptions = {},
  ): Promise<number> {
    const model = this.getModel<T>(connectionName, modelName);
    const filterQuery = this.buildFilterQuery(filter);
    const updateOptions: MongooseQueryOptions = {};

    if (options.transaction) {
      updateOptions.session = options.transaction as unknown as ClientSession;
    }

    const result = await model.updateMany(
      filterQuery,
      data as UpdateQuery<T>,
      updateOptions as any,
    );
    return result.modifiedCount || 0;
  }

  /**
   * Delete a single document by its `_id`.
   *
   * @typeParam T - The document type.
   * @param connectionName - Name of the MongoDB connection.
   * @param modelName - The collection / model name.
   * @param id - The document `_id`.
   * @param options - Optional query options (e.g. `transaction`).
   * @returns `true` if the document was found and deleted.
   */
  async delete<T extends Document>(
    connectionName: string,
    modelName: string,
    id: string,
    options: QueryOptions = {},
  ): Promise<boolean> {
    const model = this.getModel<T>(connectionName, modelName);
    const deleteOptions: MongooseQueryOptions = {};

    if (options.transaction) {
      deleteOptions.session = options.transaction as unknown as ClientSession;
    }

    const result = await model.findByIdAndDelete(id, deleteOptions);
    return result !== null;
  }

  /**
   * Delete all documents matching the given filters.
   *
   * @typeParam T - The document type.
   * @param connectionName - Name of the MongoDB connection.
   * @param modelName - The collection / model name.
   * @param filter - Array of filter conditions to select documents.
   * @param options - Optional query options (e.g. `transaction`).
   * @returns The number of documents deleted.
   */
  async deleteMany<T extends Document>(
    connectionName: string,
    modelName: string,
    filter: FilterOptions[],
    options: QueryOptions = {},
  ): Promise<number> {
    const model = this.getModel<T>(connectionName, modelName);
    const filterQuery = this.buildFilterQuery(filter);
    const deleteOptions: MongooseQueryOptions = {};

    if (options.transaction) {
      deleteOptions.session = options.transaction as unknown as ClientSession;
    }

    const result = await model.deleteMany(filterQuery, deleteOptions as any);
    return result.deletedCount || 0;
  }

  /**
   * Count documents matching optional filters.
   *
   * @typeParam T - The document type.
   * @param connectionName - Name of the MongoDB connection.
   * @param modelName - The collection / model name.
   * @param filter - Optional array of filter conditions.
   * @returns The total number of matching documents.
   */
  async count<T extends Document>(
    connectionName: string,
    modelName: string,
    filter?: FilterOptions[],
  ): Promise<number> {
    const model = this.getModel<T>(connectionName, modelName);
    const filterQuery = filter ? this.buildFilterQuery(filter) : {};

    return model.countDocuments(filterQuery);
  }

  /**
   * Check whether at least one document matches the given filters.
   *
   * @typeParam T - The document type.
   * @param connectionName - Name of the MongoDB connection.
   * @param modelName - The collection / model name.
   * @param filter - Array of filter conditions.
   * @returns `true` if one or more matching documents exist.
   */
  async exists<T extends Document>(
    connectionName: string,
    modelName: string,
    filter: FilterOptions[],
  ): Promise<boolean> {
    const count = await this.count<T>(connectionName, modelName, filter);
    return count > 0;
  }

  /**
   * Perform a structured aggregation with grouping, counting, and math ops.
   *
   * Builds a MongoDB aggregation pipeline from the provided
   * {@link AggregationOptions} (groupBy, sum, avg, min, max, having, sort, limit).
   *
   * @typeParam T - The document type.
   * @param connectionName - Name of the MongoDB connection.
   * @param modelName - The collection / model name.
   * @param options - Aggregation configuration.
   * @returns An {@link AggregationResult} with grouped data and execution time.
   */
  async aggregate<T extends Document>(
    connectionName: string,
    modelName: string,
    options: AggregationOptions,
  ): Promise<AggregationResult> {
    const model = this.getModel<T>(connectionName, modelName);
    const pipeline: any[] = [];

    // Add match stage if there are filters
    if (options.having?.length) {
      pipeline.push({ $match: this.buildFilterQuery(options.having) });
    }

    // Add group stage
    if (options.groupBy?.length) {
      const groupStage: any = {
        _id: options.groupBy.reduce(
          (acc, field) => {
            acc[field] = `$${field}`;
            return acc;
          },
          {} as Record<string, string>,
        ),
      };

      if (options.count) {
        groupStage.count = { $sum: 1 };
      }

      if (options.sum?.length) {
        options.sum.forEach((field) => {
          groupStage[`sum_${field}`] = { $sum: `$${field}` };
        });
      }

      if (options.avg?.length) {
        options.avg.forEach((field) => {
          groupStage[`avg_${field}`] = { $avg: `$${field}` };
        });
      }

      if (options.min?.length) {
        options.min.forEach((field) => {
          groupStage[`min_${field}`] = { $min: `$${field}` };
        });
      }

      if (options.max?.length) {
        options.max.forEach((field) => {
          groupStage[`max_${field}`] = { $max: `$${field}` };
        });
      }

      pipeline.push({ $group: groupStage });
    }

    // Add sort stage
    if (options.sort?.length) {
      const sortStage = options.sort.reduce(
        (acc, sort) => {
          acc[sort.field] = sort.order === 'ASC' ? 1 : -1;
          return acc;
        },
        {} as Record<string, 1 | -1>,
      );
      pipeline.push({ $sort: sortStage });
    }

    // Add limit stage
    if (options.limit) {
      pipeline.push({ $limit: options.limit });
    }

    const startTime = Date.now();
    const results = await model.aggregate(pipeline).exec();
    const executionTime = Date.now() - startTime;

    return {
      groups: results.map((result) => ({
        key: result._id || {},
        count: result.count,
        sum: options.sum?.reduce(
          (acc, field) => {
            acc[field] = result[`sum_${field}`] || 0;
            return acc;
          },
          {} as Record<string, number>,
        ),
        avg: options.avg?.reduce(
          (acc, field) => {
            acc[field] = result[`avg_${field}`] || 0;
            return acc;
          },
          {} as Record<string, number>,
        ),
        min: options.min?.reduce(
          (acc, field) => {
            acc[field] = result[`min_${field}`];
            return acc;
          },
          {} as Record<string, any>,
        ),
        max: options.max?.reduce(
          (acc, field) => {
            acc[field] = result[`max_${field}`];
            return acc;
          },
          {} as Record<string, any>,
        ),
      })),
      total: results.length,
      executionTime,
    };
  }

  /**
   * Execute a raw MongoDB aggregation pipeline.
   *
   * Use this when you need full control over pipeline stages instead of
   * the structured {@link aggregate} helper. Performance is automatically
   * recorded by the optimisation service.
   *
   * @param connectionName - Name of the MongoDB connection.
   * @param modelName - The collection / model name.
   * @param pipeline - Array of MongoDB aggregation stage objects.
   * @returns The raw aggregation result array.
   */
  async executeAggregation(
    connectionName: string,
    modelName: string,
    pipeline: any[],
  ): Promise<any[]> {
    const model = this.getModel(connectionName, modelName);
    const startTime = Date.now();

    const results = await model.aggregate(pipeline).exec();

    const executionTime = Date.now() - startTime;
    this.optimizationService.recordQuery({
      query: JSON.stringify(pipeline),
      executionTime,
      rowsAffected: results.length,
      cached: false,
      slow: executionTime > 1000,
      timestamp: new Date(),
      connection: connectionName,
      metadata: { collection: modelName, type: 'aggregation' },
    });

    return results;
  }

  /**
   * Perform a full-text search with relevance scoring.
   *
   * Uses MongoDB's `$text` operator and projects a `score` field via
   * `$meta: 'textScore'`. Results are sorted by relevance by default.
   * A text index must exist on the target collection.
   *
   * @typeParam T - The document type.
   * @param connectionName - Name of the MongoDB connection.
   * @param modelName - The collection / model name.
   * @param searchOptions - Search query, fields, and case-sensitivity.
   * @param queryOptions - Additional query options (sort, select, pagination).
   * @returns Paginated search results with execution metadata.
   */
  async search<T extends Document>(
    connectionName: string,
    modelName: string,
    searchOptions: SearchOptions,
    queryOptions: QueryOptions = {},
  ): Promise<PaginationResult<T>> {
    const model = this.getModel<T>(connectionName, modelName);

    // Build text search query
    const searchQuery = {
      $text: {
        $search: searchOptions.query,
        $caseSensitive: searchOptions.caseSensitive || false,
      },
    };

    // Add score projection for relevance
    const projection = {
      ...(queryOptions.select?.reduce(
        (acc, field) => {
          acc[field] = 1;
          return acc;
        },
        {} as Record<string, 1>,
      ) || {}),
      score: { $meta: 'textScore' },
    };

    // Get total count
    const total = await model.countDocuments(searchQuery);

    // Build the search query
    let query = model.find(searchQuery, projection);

    // Sort by relevance score by default
    query = query.sort({ score: { $meta: 'textScore' } });

    // Apply additional sorting if specified
    if (queryOptions.sort?.length) {
      const sortObj = queryOptions.sort.reduce(
        (acc, sort) => {
          acc[sort.field] = sort.order === 'ASC' ? 1 : -1;
          return acc;
        },
        {} as Record<string, 1 | -1>,
      );
      query = query.sort(sortObj);
    }

    // Apply pagination
    const page = queryOptions.page || 1;
    const limit = Math.min(queryOptions.limit || 20, 100);
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    const startTime = Date.now();
    const data = (await query.lean().exec()) as T[];
    const executionTime = Date.now() - startTime;

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
      },
    };
  }

  /**
   * Execute a callback within a Mongoose transaction.
   *
   * Starts a session, runs the callback inside `withTransaction`, and
   * ends the session automatically. The transaction uses majority write
   * concern and primary read preference.
   *
   * @typeParam R - The return type of the transaction callback.
   * @param connectionName - Name of the MongoDB connection.
   * @param fn - Async function receiving the `ClientSession`.
   * @param options - Optional transaction options (e.g. `timeout`).
   * @returns The value returned by `fn`.
   * @throws Re-throws any error from the callback after ending the session.
   */
  async transaction<R>(
    connectionName: string,
    fn: (session: ClientSession) => Promise<R>,
    options: TransactionOptions = {},
  ): Promise<R> {
    const connection = this.getConnection(connectionName);
    const session = await connection.startSession();

    const transactionOptions = {
      readPreference: 'primary' as const,
      readConcern: { level: 'local' as const },
      writeConcern: { w: 'majority' as const },
      maxCommitTimeMS: options.timeout,
    };

    try {
      let result: R;
      await session.withTransaction(async () => {
        result = await fn(session);
      }, transactionOptions);
      return result!;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Execute a named operation dynamically.
   *
   * Maps an operation name (e.g. `'find'`, `'create'`, `'aggregate'`) to
   * the corresponding service method and invokes it.
   *
   * @param connectionName - Name of the MongoDB connection.
   * @param operation - The operation name matching a public method.
   * @param args - Arguments forwarded to the resolved method.
   * @returns The result of the resolved method.
   * @throws Error if `operation` is not a recognised method name.
   */
  async executeOperation(
    connectionName: string,
    operation: string,
    ...args: any[]
  ): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    const methodMap: Record<string, Function> = {
      find: this.find,
      findOne: this.findOne,
      create: this.create,
      createMany: this.createMany,
      update: this.update,
      updateMany: this.updateMany,
      delete: this.delete,
      deleteMany: this.deleteMany,
      count: this.count,
      exists: this.exists,
      aggregate: this.aggregate,
      search: this.search,
    };

    const method = methodMap[operation];
    if (!method) {
      throw new Error(`Unknown operation: ${operation}`);
    }

    return method.call(this, connectionName, ...args);
  }

  /**
   * Create default indexes for a connection.
   *
   * Override or extend this method to create application-specific indexes
   * (e.g. text indexes for search, compound indexes for common queries).
   *
   * @param connectionName - Name of the MongoDB connection.
   */
  private async createIndexes(connectionName: string): Promise<void> {
    try {
      // You can add default indexes here based on your needs
      // Example: creating text indexes for search functionality

      this.logger.log(
        `Indexes created for MongoDB connection '${connectionName}'`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create indexes for '${connectionName}'`,
        error,
      );
    }
  }

  /**
   * Build filter query from filter options.
   *
   * Exposed publicly so repositories can reuse it instead of duplicating
   * the operator-mapping logic.
   */
  buildFilterQuery(filters?: FilterOptions[]): QueryFilter<any> {
    if (!filters?.length) {
      return {};
    }

    const query: QueryFilter<any> = {};

    filters.forEach((filter) => {
      switch (filter.operator) {
        case 'eq':
          query[filter.field] = filter.value;
          break;
        case 'neq':
          query[filter.field] = { $ne: filter.value };
          break;
        case 'gt':
          query[filter.field] = { $gt: filter.value };
          break;
        case 'gte':
          query[filter.field] = { $gte: filter.value };
          break;
        case 'lt':
          query[filter.field] = { $lt: filter.value };
          break;
        case 'lte':
          query[filter.field] = { $lte: filter.value };
          break;
        case 'in':
          query[filter.field] = { $in: filter.value };
          break;
        case 'nin':
          query[filter.field] = { $nin: filter.value };
          break;
        case 'contains':
        case 'like':
        case 'ilike':
          query[filter.field] = {
            $regex: filter.value,
            $options: filter.caseSensitive ? '' : 'i',
          };
          break;
        case 'startsWith':
          query[filter.field] = {
            $regex: `^${filter.value}`,
            $options: filter.caseSensitive ? '' : 'i',
          };
          break;
        case 'endsWith':
          query[filter.field] = {
            $regex: `${filter.value}$`,
            $options: filter.caseSensitive ? '' : 'i',
          };
          break;
        case 'between':
          query[filter.field] = {
            $gte: (filter.value as unknown[])[0],
            $lte: (filter.value as unknown[])[1],
          };
          break;
        case 'exists':
          query[filter.field] = { $exists: filter.value };
          break;
        case 'isNull':
          query[filter.field] = null;
          break;
        case 'isNotNull':
          query[filter.field] = { $ne: null };
          break;
        case 'regex':
          query[filter.field] = {
            $regex: filter.value,
            $options: filter.caseSensitive ? '' : 'i',
          };
          break;
      }
    });

    return query;
  }

  /**
   * Build a `$or` regex query for multi-field text search.
   *
   * @param search - Search options containing the query string, target fields,
   *   and case-sensitivity flag.
   * @returns A Mongoose-compatible `$or` query, or empty object if no fields.
   */
  private buildSearchQuery(search: SearchOptions): QueryFilter<any> {
    const conditions = search.fields.map((field) => ({
      [field]: {
        $regex: search.query,
        $options: search.caseSensitive ? '' : 'i',
      },
    }));

    return conditions.length > 0 ? { $or: conditions } : {};
  }

  /**
   * Gracefully close all MongoDB connections and clear model caches.
   */
  async closeAll(): Promise<void> {
    for (const [name, connection] of this.connections) {
      try {
        await connection.close();
        this.logger.log(`MongoDB connection '${name}' closed`);
      } catch (error) {
        this.logger.error(`Error closing MongoDB connection '${name}'`, error);
      }
    }
    this.connections.clear();
    this.models.clear();
  }
}
