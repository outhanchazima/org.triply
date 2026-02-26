/**
 * @fileoverview MongoDB Aggregation Pipeline Builder
 * @module database/utils
 * @description Fluent, type-safe builder for constructing MongoDB aggregation
 * pipelines. Supports all standard pipeline stages and provides convenience
 * methods for common patterns like pagination, text search, and geo queries.
 *
 * @example
 * ```typescript
 * const pipeline = new PipelineBuilder()
 *   .match({ status: 'active' })
 *   .lookup({ from: 'users', localField: 'userId', foreignField: '_id', as: 'user' })
 *   .unwind('$user')
 *   .group({ _id: '$category', total: { $sum: '$amount' } })
 *   .sort({ total: -1 })
 *   .limit(10)
 *   .build();
 * ```
 */

import { FilterOptions } from '../interfaces/database.interface';

// ── Stage option interfaces ───────────────────────────────

export interface LookupOptions {
  /** Foreign collection name */
  from: string;
  /** Local field to join on */
  localField: string;
  /** Foreign field to join on */
  foreignField: string;
  /** Output array field name */
  as: string;
}

export interface LookupPipelineOptions {
  /** Foreign collection name */
  from: string;
  /** Variables from the local document to reference in the pipeline */
  let?: Record<string, unknown>;
  /** Sub-pipeline to execute on the foreign collection */
  pipeline: Record<string, unknown>[];
  /** Output array field name */
  as: string;
}

export interface GraphLookupOptions {
  /** Foreign collection name */
  from: string;
  /** Expression for the value to start the recursive search with */
  startWith: string;
  /** Field in the foreign collection to match `connectFromField` against */
  connectFromField: string;
  /** Field in the foreign collection to recurse on */
  connectToField: string;
  /** Output array field name */
  as: string;
  /** Maximum recursion depth */
  maxDepth?: number;
  /** Name of the depth field added to each result document */
  depthField?: string;
  /** Additional filter to apply to the recursive search */
  restrictSearchWithMatch?: Record<string, unknown>;
}

export interface BucketOptions {
  /** Field or expression to group by */
  groupBy: string;
  /** Array of boundary values */
  boundaries: unknown[];
  /** Value for documents that fall outside the boundaries */
  default?: unknown;
  /** Accumulator expressions for each bucket */
  output?: Record<string, unknown>;
}

export interface BucketAutoOptions {
  /** Field or expression to group by */
  groupBy: string;
  /** Target number of buckets */
  buckets: number;
  /** Accumulator expressions for each bucket */
  output?: Record<string, unknown>;
  /** Preferred number series for bucket boundaries */
  granularity?:
    | 'R5'
    | 'R10'
    | 'R20'
    | 'R40'
    | 'R80'
    | '1-2-5'
    | 'E6'
    | 'E12'
    | 'E24'
    | 'E48'
    | 'E96'
    | 'E192'
    | 'POWERSOF2';
}

export interface FacetOptions {
  /** Map of facet name → pipeline stages */
  [facetName: string]: Record<string, unknown>[];
}

export interface GeoNearOptions {
  /** Point to calculate distances from */
  near: { type: 'Point'; coordinates: [number, number] };
  /** Output field for the calculated distance */
  distanceField: string;
  /** Maximum distance in meters */
  maxDistance?: number;
  /** Minimum distance in meters */
  minDistance?: number;
  /** Optional query filter */
  query?: Record<string, unknown>;
  /** Whether to use spherical geometry */
  spherical?: boolean;
  /** Multiplier for all distances */
  distanceMultiplier?: number;
  /** Field for the location data */
  key?: string;
}

export interface MergeOptions {
  /** Target collection (or { db, coll }) */
  into: string | { db: string; coll: string };
  /** Fields to use as the unique identifier */
  on?: string | string[];
  /** Action when a matching document exists */
  whenMatched?:
    | 'replace'
    | 'keepExisting'
    | 'merge'
    | 'fail'
    | Record<string, unknown>[];
  /** Action when no matching document exists */
  whenNotMatched?: 'insert' | 'discard' | 'fail';
}

export interface UnionWithOptions {
  /** Collection to union with */
  coll: string;
  /** Optional pipeline to apply to the other collection */
  pipeline?: Record<string, unknown>[];
}

export interface WindowOptions {
  /** Window field definitions */
  output: Record<string, unknown>;
  /** Sort specification for the window */
  sortBy?: Record<string, 1 | -1>;
  /** Partitioning expression */
  partitionBy?: string | Record<string, unknown>;
}

// ── Pipeline Builder ──────────────────────────────────────

/**
 * Fluent builder for MongoDB aggregation pipelines.
 *
 * Every method returns `this` for chaining, except `build()` which
 * returns the raw pipeline array ready for `Model.aggregate()`.
 *
 * @example
 * ```typescript
 * // Revenue per category, top 5
 * const pipeline = new PipelineBuilder()
 *   .match({ status: 'completed' })
 *   .group({ _id: '$category', revenue: { $sum: '$amount' } })
 *   .sort({ revenue: -1 })
 *   .limit(5)
 *   .build();
 *
 * // Paginated lookup
 * const pipeline = new PipelineBuilder()
 *   .match({ active: true })
 *   .lookupAndUnwind({
 *     from: 'profiles', localField: 'profileId',
 *     foreignField: '_id', as: 'profile',
 *   })
 *   .paginate(2, 20)
 *   .build();
 * ```
 */
export class PipelineBuilder {
  private readonly stages: Record<string, unknown>[] = [];

  // ── Core stages ─────────────────────────────────────

  /**
   * `$match` — filter documents.
   *
   * @param query - MongoDB filter expression.
   */
  match(query: Record<string, unknown>): this {
    this.stages.push({ $match: query });
    return this;
  }

  /**
   * `$match` built from {@link FilterOptions} array.
   * Re-uses the same filter-to-query logic as the rest of the database lib.
   *
   * @param filters - Array of filter option objects.
   */
  matchFromFilters(filters: FilterOptions[]): this {
    const query: Record<string, unknown> = {};

    for (const filter of filters) {
      const op = filter.operator as string;
      switch (op) {
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
        case 'between': {
          const vals = filter.value as unknown[];
          query[filter.field] = { $gte: vals[0], $lte: vals[1] };
          break;
        }
        case 'like':
        case 'contains':
          query[filter.field] = { $regex: filter.value, $options: '' };
          break;
        case 'ilike':
        case 'icontains':
          query[filter.field] = { $regex: filter.value, $options: 'i' };
          break;
        case 'startsWith':
          query[filter.field] = { $regex: `^${filter.value}`, $options: '' };
          break;
        case 'endsWith':
          query[filter.field] = { $regex: `${filter.value}$`, $options: '' };
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
          query[filter.field] = { $regex: filter.value };
          break;
        default:
          query[filter.field] = filter.value;
      }
    }

    this.stages.push({ $match: query });
    return this;
  }

  /**
   * `$project` — reshape documents (include, exclude, or compute fields).
   *
   * @param projection - Projection specification.
   */
  project(projection: Record<string, unknown>): this {
    this.stages.push({ $project: projection });
    return this;
  }

  /**
   * `$group` — group documents and apply accumulators.
   *
   * @param spec - Group specification including `_id` and accumulators.
   *
   * @example
   * ```ts
   * .group({ _id: '$status', count: { $sum: 1 } })
   * ```
   */
  group(spec: Record<string, unknown>): this {
    this.stages.push({ $group: spec });
    return this;
  }

  /**
   * `$sort` — order documents.
   *
   * @param spec - Sort specification, e.g. `{ createdAt: -1 }`.
   */
  sort(spec: Record<string, 1 | -1>): this {
    this.stages.push({ $sort: spec });
    return this;
  }

  /**
   * `$limit` — cap the number of documents.
   */
  limit(n: number): this {
    this.stages.push({ $limit: n });
    return this;
  }

  /**
   * `$skip` — skip a number of documents.
   */
  skip(n: number): this {
    this.stages.push({ $skip: n });
    return this;
  }

  /**
   * `$unwind` — deconstruct an array field.
   *
   * @param path - Array field path (e.g. `"$tags"`).
   * @param options - Optional `preserveNullAndEmptyArrays` and `includeArrayIndex`.
   */
  unwind(
    path: string,
    options?: {
      preserveNullAndEmptyArrays?: boolean;
      includeArrayIndex?: string;
    },
  ): this {
    if (options) {
      this.stages.push({ $unwind: { path, ...options } });
    } else {
      this.stages.push({ $unwind: path });
    }
    return this;
  }

  // ── Join stages ─────────────────────────────────────

  /**
   * `$lookup` — left outer join with another collection (equality match).
   */
  lookup(options: LookupOptions): this {
    this.stages.push({ $lookup: options });
    return this;
  }

  /**
   * `$lookup` with a sub-pipeline (correlated or uncorrelated).
   */
  lookupPipeline(options: LookupPipelineOptions): this {
    this.stages.push({ $lookup: options });
    return this;
  }

  /**
   * `$lookup` + `$unwind` in one call — the most common join pattern.
   *
   * Uses `preserveNullAndEmptyArrays: true` so unmatched documents
   * produce a `null` field rather than being dropped.
   */
  lookupAndUnwind(options: LookupOptions, preserveNullAndEmpty = true): this {
    this.lookup(options);
    this.unwind(`$${options.as}`, {
      preserveNullAndEmptyArrays: preserveNullAndEmpty,
    });
    return this;
  }

  /**
   * `$graphLookup` — recursive lookup for tree / graph structures.
   */
  graphLookup(options: GraphLookupOptions): this {
    this.stages.push({ $graphLookup: options });
    return this;
  }

  // ── Field manipulation stages ───────────────────────

  /**
   * `$addFields` / `$set` — add or overwrite fields.
   */
  addFields(fields: Record<string, unknown>): this {
    this.stages.push({ $addFields: fields });
    return this;
  }

  /**
   * Alias for `addFields`.
   */
  set(fields: Record<string, unknown>): this {
    this.stages.push({ $set: fields });
    return this;
  }

  /**
   * `$unset` — remove fields.
   *
   * @param fields - Field name(s) to remove.
   */
  unset(...fields: string[]): this {
    this.stages.push({ $unset: fields.length === 1 ? fields[0] : fields });
    return this;
  }

  /**
   * `$replaceRoot` — promote a nested document to the top level.
   *
   * @param newRoot - Expression for the new root document.
   */
  replaceRoot(newRoot: string | Record<string, unknown>): this {
    this.stages.push({
      $replaceRoot: {
        newRoot: typeof newRoot === 'string' ? `$${newRoot}` : newRoot,
      },
    });
    return this;
  }

  /**
   * `$replaceWith` — alias for `$replaceRoot` (MongoDB 4.2+).
   */
  replaceWith(expression: string | Record<string, unknown>): this {
    this.stages.push({
      $replaceWith:
        typeof expression === 'string' ? `$${expression}` : expression,
    });
    return this;
  }

  // ── Grouping / bucketing stages ─────────────────────

  /**
   * `$bucket` — categorise documents into fixed-boundary buckets.
   */
  bucket(options: BucketOptions): this {
    this.stages.push({
      $bucket: {
        groupBy: options.groupBy.startsWith('$')
          ? options.groupBy
          : `$${options.groupBy}`,
        boundaries: options.boundaries,
        default: options.default,
        output: options.output,
      },
    });
    return this;
  }

  /**
   * `$bucketAuto` — auto-compute bucket boundaries.
   */
  bucketAuto(options: BucketAutoOptions): this {
    this.stages.push({
      $bucketAuto: {
        groupBy: options.groupBy.startsWith('$')
          ? options.groupBy
          : `$${options.groupBy}`,
        buckets: options.buckets,
        output: options.output,
        granularity: options.granularity,
      },
    });
    return this;
  }

  /**
   * `$facet` — run multiple sub-pipelines in parallel on the same input.
   *
   * @example
   * ```ts
   * .facet({
   *   totalCount: [{ $count: 'count' }],
   *   priceBuckets: [{ $bucket: { groupBy: '$price', boundaries: [0, 50, 100, 500] } }],
   * })
   * ```
   */
  facet(facets: FacetOptions): this {
    this.stages.push({ $facet: facets });
    return this;
  }

  // ── Output stages ───────────────────────────────────

  /**
   * `$count` — count remaining documents and output as a named field.
   *
   * @param fieldName - The output field name (default `"count"`).
   */
  count(fieldName = 'count'): this {
    this.stages.push({ $count: fieldName });
    return this;
  }

  /**
   * `$out` — write pipeline results to a collection (replaces existing).
   *
   * @param collection - Target collection name.
   */
  out(collection: string): this {
    this.stages.push({ $out: collection });
    return this;
  }

  /**
   * `$merge` — merge pipeline results into a collection.
   */
  merge(options: MergeOptions): this {
    this.stages.push({ $merge: options });
    return this;
  }

  // ── Sampling / limiting stages ──────────────────────

  /**
   * `$sample` — randomly select N documents.
   */
  sample(size: number): this {
    this.stages.push({ $sample: { size } });
    return this;
  }

  // ── Geo stages ──────────────────────────────────────

  /**
   * `$geoNear` — proximity search (must be the **first** stage).
   */
  geoNear(options: GeoNearOptions): this {
    this.stages.push({ $geoNear: options });
    return this;
  }

  // ── Set operations ──────────────────────────────────

  /**
   * `$unionWith` — append documents from another collection.
   */
  unionWith(options: UnionWithOptions | string): this {
    this.stages.push({
      $unionWith: typeof options === 'string' ? { coll: options } : options,
    });
    return this;
  }

  // ── Window functions (MongoDB 5.0+) ─────────────────

  /**
   * `$setWindowFields` — apply window functions.
   */
  setWindowFields(options: WindowOptions): this {
    this.stages.push({
      $setWindowFields: {
        partitionBy: options.partitionBy,
        sortBy: options.sortBy,
        output: options.output,
      },
    });
    return this;
  }

  // ── Security / access control ───────────────────────

  /**
   * `$redact` — restrict document content based on conditions.
   *
   * @param expression - `$redact` expression using $$DESCEND, $$PRUNE, $$KEEP.
   */
  redact(expression: Record<string, unknown>): this {
    this.stages.push({ $redact: expression });
    return this;
  }

  // ── Raw stage ───────────────────────────────────────

  /**
   * Append a raw pipeline stage object.
   * Use for stages not covered by the builder API.
   */
  raw(stage: Record<string, unknown>): this {
    this.stages.push(stage);
    return this;
  }

  /**
   * Append multiple raw stages at once.
   */
  rawStages(stages: Record<string, unknown>[]): this {
    this.stages.push(...stages);
    return this;
  }

  // ── Convenience / composite methods ─────────────────

  /**
   * Add `$skip` + `$limit` stages for pagination.
   *
   * @param page     - 1-based page number.
   * @param pageSize - Number of documents per page.
   */
  paginate(page: number, pageSize: number): this {
    const skip = (Math.max(1, page) - 1) * pageSize;
    this.skip(skip);
    this.limit(pageSize);
    return this;
  }

  /**
   * Convenience: `$match` + `$sort` + pagination.
   *
   * @param filter   - Match filter.
   * @param sort     - Sort spec.
   * @param page     - 1-based page number.
   * @param pageSize - Documents per page.
   */
  filterSortPaginate(
    filter: Record<string, unknown>,
    sort: Record<string, 1 | -1>,
    page: number,
    pageSize: number,
  ): this {
    this.match(filter);
    this.sort(sort);
    this.paginate(page, pageSize);
    return this;
  }

  /**
   * Convenience: add a `$match` with a `$text` search expression.
   *
   * @param searchText - The text to search for.
   * @param language   - Optional language for the text index.
   */
  textSearch(searchText: string, language?: string): this {
    const textExpr: Record<string, unknown> = { $search: searchText };
    if (language) textExpr.$language = language;
    this.stages.push({ $match: { $text: textExpr } });
    return this;
  }

  /**
   * Convenience: `$sort` by text search score, projecting the score field.
   *
   * @param scoreField - Name of the score field (default `"score"`).
   */
  sortByTextScore(scoreField = 'score'): this {
    this.addFields({ [scoreField]: { $meta: 'textScore' } });
    this.sort({ [scoreField]: -1 as 1 | -1 });
    return this;
  }

  /**
   * Convenience: group by a field and count occurrences, sorted descending.
   *
   * @param field      - Field to group by.
   * @param countField - Name for the count accumulator (default `"count"`).
   */
  countByField(field: string, countField = 'count'): this {
    this.group({
      _id: field.startsWith('$') ? field : `$${field}`,
      [countField]: { $sum: 1 },
    });
    this.sort({ [countField]: -1 });
    return this;
  }

  /**
   * Convenience: compute sum, avg, min, max for a field grouped by another.
   *
   * @param groupByField - Field to group by.
   * @param valueField   - Numeric field to aggregate.
   */
  stats(groupByField: string, valueField: string): this {
    const gf = groupByField.startsWith('$') ? groupByField : `$${groupByField}`;
    const vf = valueField.startsWith('$') ? valueField : `$${valueField}`;
    this.group({
      _id: gf,
      count: { $sum: 1 },
      sum: { $sum: vf },
      avg: { $avg: vf },
      min: { $min: vf },
      max: { $max: vf },
    });
    return this;
  }

  /**
   * Convenience: use `$facet` to get both paginated data and total count
   * in a single aggregation.
   *
   * @param page     - 1-based page number.
   * @param pageSize - Documents per page.
   * @param dataField  - Facet name for the data (default `"data"`).
   * @param countField - Facet name for the total count (default `"totalCount"`).
   */
  paginatedFacet(
    page: number,
    pageSize: number,
    dataField = 'data',
    countField = 'totalCount',
  ): this {
    const skip = (Math.max(1, page) - 1) * pageSize;
    this.facet({
      [dataField]: [{ $skip: skip }, { $limit: pageSize }],
      [countField]: [{ $count: 'count' }],
    });
    return this;
  }

  /**
   * Conditionally append stages. Useful for building dynamic pipelines.
   *
   * @param condition - If falsy, the callback is not executed.
   * @param fn        - Builder callback invoked when condition is truthy.
   *
   * @example
   * ```ts
   * new PipelineBuilder()
   *   .match({ active: true })
   *   .when(category, (b) => b.match({ category }))
   *   .sort({ createdAt: -1 })
   *   .build();
   * ```
   */
  when(condition: unknown, fn: (builder: this) => void): this {
    if (condition) fn(this);
    return this;
  }

  // ── Build ───────────────────────────────────────────

  /**
   * Return the accumulated pipeline stages as a plain array.
   * Pass the result to `Model.aggregate()` or `MongoService.executeAggregation()`.
   */
  build(): Record<string, unknown>[] {
    return [...this.stages];
  }

  /**
   * Return the number of stages in the current pipeline.
   */
  get length(): number {
    return this.stages.length;
  }

  /**
   * Return a JSON string of the pipeline (useful for logging / debugging).
   */
  toJSON(): string {
    return JSON.stringify(this.stages, null, 2);
  }
}
