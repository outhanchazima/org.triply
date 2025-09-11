import { Model, Document, ClientSession } from 'mongoose';
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
  QueryRunner,
} from '../interfaces/database.interface';
import { MongoService } from '../services/mongo.service';

export class BaseMongoRepository<T extends Document>
  implements IBaseRepository<T>
{
  protected model: Model<T>;
  protected connectionName: string;
  protected modelName: string;

  constructor(
    private readonly mongoService: MongoService,
    connectionName: string,
    modelName: string,
    schema?: any
  ) {
    this.connectionName = connectionName;
    this.modelName = modelName;
    this.model = this.mongoService.getModel<T>(
      connectionName,
      modelName,
      schema
    );
  }

  /**
   * Find one record by ID
   */
  async findOne(
    id: string | number,
    options?: QueryOptions
  ): Promise<T | null> {
    const filter: FilterOptions[] = [
      { field: '_id', operator: 'eq', value: id },
    ];
    return this.mongoService.findOne(
      this.connectionName,
      this.modelName,
      filter,
      options
    );
  }

  /**
   * Find many records with pagination
   */
  async findMany(options?: QueryOptions): Promise<PaginationResult<T>> {
    return this.mongoService.find(this.connectionName, this.modelName, options);
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>, options?: QueryOptions): Promise<T> {
    return this.mongoService.create(
      this.connectionName,
      this.modelName,
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
    return this.mongoService.createMany(
      this.connectionName,
      this.modelName,
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
    const result = await this.mongoService.update(
      this.connectionName,
      this.modelName,
      String(id),
      data,
      options
    );
    if (!result) {
      throw new Error(`Record with id ${id} not found`);
    }
    return result;
  }

  /**
   * Update many records
   */
  async updateMany(
    filter: FilterOptions[],
    data: Partial<T>,
    options?: QueryOptions
  ): Promise<number> {
    return this.mongoService.updateMany(
      this.connectionName,
      this.modelName,
      filter,
      data,
      options
    );
  }

  /**
   * Delete a record
   */
  async delete(id: string | number, options?: QueryOptions): Promise<boolean> {
    return this.mongoService.delete(
      this.connectionName,
      this.modelName,
      String(id),
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
    return this.mongoService.deleteMany(
      this.connectionName,
      this.modelName,
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
    return this.mongoService.count(
      this.connectionName,
      this.modelName,
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
    return this.mongoService.exists(
      this.connectionName,
      this.modelName,
      filter,
      options
    );
  }

  /**
   * Perform aggregation
   */
  async aggregate(options: AggregationOptions): Promise<AggregationResult> {
    return this.mongoService.aggregate(
      this.connectionName,
      this.modelName,
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
    return this.mongoService.search(
      this.connectionName,
      this.modelName,
      searchOptions,
      queryOptions
    );
  }

  /**
   * Execute in transaction
   */
  async transaction<R>(
    fn: (queryRunner: QueryRunner) => Promise<R>,
    options?: TransactionOptions
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
      options
    );
  }

  /**
   * Find or create a record
   */
  async findOrCreate(
    filter: FilterOptions[],
    data: Partial<T>,
    options?: QueryOptions
  ): Promise<{ entity: T; created: boolean }> {
    const existing = await this.mongoService.findOne(
      this.connectionName,
      this.modelName,
      filter,
      options
    );

    if (existing) {
      return { entity: existing, created: false };
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
    const existing = await this.mongoService.findOne(
      this.connectionName,
      this.modelName,
      filter,
      options
    );

    if (existing) {
      const id = existing._id || (existing as any).id;
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
        const existing = await this.mongoService.findOne(
          this.connectionName,
          this.modelName,
          filter,
          options
        );

        if (existing) {
          const id = existing._id || (existing as any).id;
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
   * Execute aggregation pipeline
   */
  async aggregatePipeline(pipeline: any[]): Promise<any[]> {
    return this.mongoService.executeAggregation(
      this.connectionName,
      this.modelName,
      pipeline
    );
  }

  /**
   * Get the underlying Mongoose model
   */
  getModel(): Model<T> {
    return this.model;
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
    const filterQuery = filter ? this.buildFilterQuery(filter) : {};
    return this.model.distinct(field, filterQuery);
  }

  /**
   * Create text index for search
   */
  async createTextIndex(fields: string[]): Promise<void> {
    const indexSpec = fields.reduce((acc, field) => {
      acc[field] = 'text';
      return acc;
    }, {} as Record<string, string>);

    await this.model.collection.createIndex(indexSpec);
  }

  /**
   * Create compound index
   */
  async createCompoundIndex(
    fields: Array<{ field: string; order: 1 | -1 }>,
    options?: { unique?: boolean; sparse?: boolean; background?: boolean }
  ): Promise<void> {
    const indexSpec = fields.reduce((acc, { field, order }) => {
      acc[field] = order;
      return acc;
    }, {} as Record<string, 1 | -1>);

    await this.model.collection.createIndex(indexSpec, options);
  }

  /**
   * Drop index
   */
  async dropIndex(indexName: string): Promise<void> {
    await this.model.collection.dropIndex(indexName);
  }

  /**
   * Get indexes
   */
  async getIndexes(): Promise<any[]> {
    return this.model.collection.indexes();
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
    const updateData = { $inc: { [field]: value } } as any;
    return this.model
      .findByIdAndUpdate(id, updateData, { new: true, ...options })
      .lean()
      .exec() as Promise<T | null>;
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
    return this.increment(id, field, -value, options);
  }

  /**
   * Push to array field
   */
  async push(
    id: string | number,
    field: string,
    value: any | any[],
    options?: QueryOptions
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
   * Pull from array field
   */
  async pull(
    id: string | number,
    field: string,
    value: any | any[],
    options?: QueryOptions
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
   * Add to set (unique array)
   */
  async addToSet(
    id: string | number,
    field: string,
    value: any | any[],
    options?: QueryOptions
  ): Promise<T | null> {
    const updateData = Array.isArray(value)
      ? { $addToSet: { [field]: { $each: value } } }
      : { $addToSet: { [field]: value } };

    return this.model
      .findByIdAndUpdate(id, updateData as any, { new: true, ...options })
      .lean()
      .exec() as Promise<T | null>;
  }

  /**
   * Build filter query from filter options
   */
  private buildFilterQuery(filters: FilterOptions[]): any {
    const query: any = {};

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
}
