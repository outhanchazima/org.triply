import { Injectable, Logger } from '@nestjs/common';
import {
  Connection,
  Model,
  Document,
  FilterQuery,
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

@Injectable()
export class MongoService {
  private readonly logger = new Logger(MongoService.name);
  private readonly connections: Map<string, Connection> = new Map();
  private readonly models: Map<string, Map<string, Model<any>>> = new Map();

  constructor(
    @Inject(MONGO_CONNECTIONS)
    private readonly configs: Array<{
      name: string;
      config: MongoConnectionConfig;
    }>,
    private readonly optimizationService: QueryOptimizationService,
    private readonly connectionManager: ConnectionManagerService
  ) {}

  async initialize(): Promise<void> {
    for (const { name } of this.configs) {
      try {
        // Connection is already established by Mongoose module
        // We just need to register it in our service
        const connection = await this.connectionManager.registerMongoConnection(
          name
        );
        if (connection) {
          this.connections.set(name, connection as Connection);
          this.models.set(name, new Map());

          // Create indexes for better performance
          await this.createIndexes(name);

          this.logger.log(
            `MongoDB connection '${name}' registered successfully`
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to register MongoDB connection '${name}'`,
          error
        );
        throw error;
      }
    }
  }

  /**
   * Get a specific connection by name
   */
  getConnection(name: string): Connection {
    const connection = this.connections.get(name);
    if (!connection) {
      throw new Error(`MongoDB connection '${name}' not found`);
    }
    return connection;
  }

  /**
   * Get or create a model for a collection
   */
  getModel<T extends Document>(
    connectionName: string,
    modelName: string,
    schema?: any
  ): Model<T> {
    const connection = this.getConnection(connectionName);
    const modelMap = this.models.get(connectionName);

    if (!modelMap?.has(modelName)) {
      if (!schema) {
        // Use a dynamic schema if none provided
        const model = connection.model<T>(
          modelName,
          new connection.base.Schema({}, { strict: false })
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
   * Find documents with advanced filtering, pagination, and sorting
   */
  async find<T extends Document>(
    connectionName: string,
    modelName: string,
    options: QueryOptions = {}
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
      findQuery = findQuery.select(options.select.join(' '));
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
        });
      });
    }

    // Apply sorting
    if (options.sort?.length) {
      const sortObj = options.sort.reduce((acc, sort) => {
        acc[sort.field] = sort.order === 'ASC' ? 1 : -1;
        return acc;
      }, {} as Record<string, 1 | -1>);
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
   * Find one document
   */
  async findOne<T extends Document>(
    connectionName: string,
    modelName: string,
    filter: FilterOptions[],
    options: QueryOptions = {}
  ): Promise<T | null> {
    const model = this.getModel<T>(connectionName, modelName);
    const filterQuery = this.buildFilterQuery(filter);

    let query = model.findOne(filterQuery);

    if (options.select?.length) {
      query = query.select(options.select.join(' '));
    }

    if (options.populate?.length) {
      options.populate.forEach((pop) => {
        query = query.populate({
          path: pop.path,
          select: pop.select?.join(' '),
          match: pop.match,
          options: pop.options,
          populate: pop.populate as any,
        });
      });
    }

    return query.lean().exec() as Promise<T | null>;
  }

  /**
   * Create a new document
   */
  async create<T extends Document>(
    connectionName: string,
    modelName: string,
    data: Partial<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const model = this.getModel<T>(connectionName, modelName);

    if (options.transaction) {
      const session = options.transaction as unknown as ClientSession;
      return model.create([data], { session }).then((docs) => docs[0]);
    }

    const document = new model(data);
    return document.save() as Promise<T>;
  }

  /**
   * Bulk create documents
   */
  async createMany<T extends Document>(
    connectionName: string,
    modelName: string,
    data: Partial<T>[],
    options: QueryOptions = {}
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
   * Update a document
   */
  async update<T extends Document>(
    connectionName: string,
    modelName: string,
    id: string,
    data: Partial<T>,
    options: QueryOptions = {}
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
   * Update multiple documents
   */
  async updateMany<T extends Document>(
    connectionName: string,
    modelName: string,
    filter: FilterOptions[],
    data: Partial<T>,
    options: QueryOptions = {}
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
      updateOptions
    );
    return result.modifiedCount || 0;
  }

  /**
   * Delete a document
   */
  async delete<T extends Document>(
    connectionName: string,
    modelName: string,
    id: string,
    options: QueryOptions = {}
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
   * Delete multiple documents
   */
  async deleteMany<T extends Document>(
    connectionName: string,
    modelName: string,
    filter: FilterOptions[],
    options: QueryOptions = {}
  ): Promise<number> {
    const model = this.getModel<T>(connectionName, modelName);
    const filterQuery = this.buildFilterQuery(filter);
    const deleteOptions: MongooseQueryOptions = {};

    if (options.transaction) {
      deleteOptions.session = options.transaction as unknown as ClientSession;
    }

    const result = await model.deleteMany(filterQuery, deleteOptions);
    return result.deletedCount || 0;
  }

  /**
   * Count documents
   */
  async count<T extends Document>(
    connectionName: string,
    modelName: string,
    filter?: FilterOptions[]
  ): Promise<number> {
    const model = this.getModel<T>(connectionName, modelName);
    const filterQuery = filter ? this.buildFilterQuery(filter) : {};

    return model.countDocuments(filterQuery);
  }

  /**
   * Check if documents exist
   */
  async exists<T extends Document>(
    connectionName: string,
    modelName: string,
    filter: FilterOptions[],
    options: QueryOptions = {}
  ): Promise<boolean> {
    const count = await this.count<T>(
      connectionName,
      modelName,
      filter,
      options
    );
    return count > 0;
  }

  /**
   * Perform aggregation
   */
  async aggregate<T extends Document>(
    connectionName: string,
    modelName: string,
    options: AggregationOptions
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
        _id: options.groupBy.reduce((acc, field) => {
          acc[field] = `$${field}`;
          return acc;
        }, {} as Record<string, string>),
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
      const sortStage = options.sort.reduce((acc, sort) => {
        acc[sort.field] = sort.order === 'ASC' ? 1 : -1;
        return acc;
      }, {} as Record<string, 1 | -1>);
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
        sum: options.sum?.reduce((acc, field) => {
          acc[field] = result[`sum_${field}`] || 0;
          return acc;
        }, {} as Record<string, number>),
        avg: options.avg?.reduce((acc, field) => {
          acc[field] = result[`avg_${field}`] || 0;
          return acc;
        }, {} as Record<string, number>),
        min: options.min?.reduce((acc, field) => {
          acc[field] = result[`min_${field}`];
          return acc;
        }, {} as Record<string, any>),
        max: options.max?.reduce((acc, field) => {
          acc[field] = result[`max_${field}`];
          return acc;
        }, {} as Record<string, any>),
      })),
      total: results.length,
      executionTime,
    };
  }

  /**
   * Execute aggregation pipeline
   */
  async executeAggregation(
    connectionName: string,
    modelName: string,
    pipeline: any[]
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
   * Perform text search
   */
  async search<T extends Document>(
    connectionName: string,
    modelName: string,
    searchOptions: SearchOptions,
    queryOptions: QueryOptions = {}
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
      ...(queryOptions.select?.reduce((acc, field) => {
        acc[field] = 1;
        return acc;
      }, {} as Record<string, 1>) || {}),
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
      const sortObj = queryOptions.sort.reduce((acc, sort) => {
        acc[sort.field] = sort.order === 'ASC' ? 1 : -1;
        return acc;
      }, {} as Record<string, 1 | -1>);
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
   * Execute a transaction
   */
  async transaction<R>(
    connectionName: string,
    fn: (session: ClientSession) => Promise<R>,
    options: TransactionOptions = {}
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
   * Create indexes for better performance
   */
  private async createIndexes(connectionName: string): Promise<void> {
    try {
      // You can add default indexes here based on your needs
      // Example: creating text indexes for search functionality

      this.logger.log(
        `Indexes created for MongoDB connection '${connectionName}'`
      );
    } catch (error) {
      this.logger.error(
        `Failed to create indexes for '${connectionName}'`,
        error
      );
    }
  }

  /**
   * Build filter query from filter options
   */
  private buildFilterQuery(filters?: FilterOptions[]): FilterQuery<any> {
    if (!filters?.length) {
      return {};
    }

    const query: FilterQuery<any> = {};

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
            $gte: filter.value[0],
            $lte: filter.value[1],
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
   * Build search query
   */
  private buildSearchQuery(search: SearchOptions): FilterQuery<any> {
    const conditions = search.fields.map((field) => ({
      [field]: {
        $regex: search.query,
        $options: search.caseSensitive ? '' : 'i',
      },
    }));

    return conditions.length > 0 ? { $or: conditions } : {};
  }

  /**
   * Close all connections
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
