/**
 * @fileoverview Filter backend system inspired by Django REST Framework
 * @module database/filters
 * @description Provides pluggable filter backends that transform incoming
 * HTTP request query parameters into structured {@link QueryOptions}.
 *
 * The module ships with four concrete backends:
 * - {@link MainQueryFilterBackend} — full-featured filter/search/sort/pagination
 * - {@link SearchFilterBackend} — text search only
 * - {@link OrderingFilterBackend} — field ordering only
 * - {@link CompositeFilterBackend} — chains multiple backends together
 *
 * Custom backends can be created by extending {@link QueryFilterBackend}.
 *
 * @author Outhan Chazima
 * @version 1.0.0
 */

import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import {
  FilterOptions,
  SortOptions,
  QueryOptions,
} from '../interfaces/database.interface';
import { QueryFilterParser } from '../utils/query-filter.parser';
import type { QueryFilterParserOptions } from '../utils/query-filter.parser';

/**
 * Interface for filter backends.
 *
 * @export
 * @interface IFilterBackend
 * @description Any class implementing this interface can be used to
 * transform HTTP request parameters into {@link QueryOptions}.
 */
export interface IFilterBackend {
  /**
   * Apply filters from the request to the queryset.
   *
   * @param request - The incoming Express request.
   * @param queryset - The current query options to augment.
   * @param view - Optional view/controller reference.
   * @returns The augmented query options.
   */
  filterQueryset(
    request: Request,
    queryset: QueryOptions,
    view?: unknown,
  ): QueryOptions;
}

/**
 * Abstract base class for filter backends.
 *
 * @abstract
 * @class QueryFilterBackend
 * @implements {IFilterBackend}
 * @description Parses Django-style `field__lookup=value` query parameters
 * and maps them to {@link FilterOptions}. Subclasses override
 * `filterQueryset` for custom behaviour.
 *
 * @example
 * ```typescript
 * class StatusFilterBackend extends QueryFilterBackend {
 *   constructor() {
 *     super({ status: ['exact', 'in'] });
 *   }
 * }
 * ```
 */
export abstract class QueryFilterBackend implements IFilterBackend {
  /** Map of field name → allowed lookup types */
  private filterFields: Map<string, string[]> = new Map();

  /**
   * @param filterFields - Optional mapping of field names to allowed lookups.
   */
  constructor(filterFields?: Record<string, string[]>) {
    if (filterFields) {
      Object.entries(filterFields).forEach(([field, lookups]) => {
        this.filterFields.set(field, lookups);
      });
    }
  }

  /**
   * Parse request query parameters and append matching filters to the queryset.
   *
   * @param request - The incoming Express request.
   * @param queryset - Current query options.
   * @param _view - Unused view reference.
   * @returns The augmented query options.
   */
  filterQueryset(
    request: Request,
    queryset: QueryOptions = {},
    _view?: unknown,
  ): QueryOptions {
    const filters: FilterOptions[] = [];

    for (const [key, value] of Object.entries(request.query)) {
      if (typeof value !== 'string') continue;

      // Parse field and lookup
      const parts = key.split('__');
      const field = parts[0];
      const lookup = parts[1] || 'exact';

      // Check if field is allowed
      const allowedLookups = this.filterFields.get(field);
      if (!allowedLookups || !allowedLookups.includes(lookup)) {
        continue;
      }

      // Create filter
      filters.push(this.createFilter(field, lookup, value));
    }

    if (filters.length > 0) {
      queryset.filter = [...(queryset.filter || []), ...filters];
    }

    return queryset;
  }

  /**
   * Map a Django-style lookup to a {@link FilterOptions} object.
   *
   * @param field - Field name.
   * @param lookup - Lookup type (e.g. `'exact'`, `'gte'`, `'in'`).
   * @param value - Raw string value from the query parameter.
   * @returns A structured filter option.
   */
  private createFilter(
    field: string,
    lookup: string,
    value: string,
  ): FilterOptions {
    switch (lookup) {
      case 'exact':
        return { field, operator: 'eq', value };
      case 'iexact':
        return { field, operator: 'eq', value, caseSensitive: false };
      case 'contains':
        return { field, operator: 'contains', value };
      case 'icontains':
        return { field, operator: 'contains', value, caseSensitive: false };
      case 'gt':
        return { field, operator: 'gt', value };
      case 'gte':
        return { field, operator: 'gte', value };
      case 'lt':
        return { field, operator: 'lt', value };
      case 'lte':
        return { field, operator: 'lte', value };
      case 'in':
        return { field, operator: 'in', value: value.split(',') };
      case 'startswith':
        return { field, operator: 'startsWith', value };
      case 'istartswith':
        return { field, operator: 'startsWith', value, caseSensitive: false };
      case 'endswith':
        return { field, operator: 'endsWith', value };
      case 'iendswith':
        return { field, operator: 'endsWith', value, caseSensitive: false };
      case 'isnull':
        return value === 'true'
          ? { field, operator: 'isNull', value: true }
          : { field, operator: 'isNotNull', value: true };
      case 'regex':
        return { field, operator: 'regex', value };
      case 'iregex':
        return { field, operator: 'regex', value, caseSensitive: false };
      default:
        return { field, operator: 'eq', value };
    }
  }

  /**
   * Register or update the allowed lookups for a field.
   *
   * @param field - Field name.
   * @param lookups - Array of allowed lookup types.
   */
  setFilterFields(field: string, lookups: string[]): void {
    this.filterFields.set(field, lookups);
  }
}

/**
 * Full-featured filter backend using {@link QueryFilterParser}.
 *
 * Handles filter parameters, search, ordering, and pagination in
 * a single pass over the request query string.
 *
 * @class MainQueryFilterBackend
 * @extends {QueryFilterBackend}
 */
@Injectable()
export class MainQueryFilterBackend extends QueryFilterBackend {
  /** Internal query-parameter parser */
  private parser: QueryFilterParser;

  /**
   * @param options - Optional parser configuration (search fields, page size).
   */
  constructor(options?: QueryFilterParserOptions) {
    super();
    this.parser = new QueryFilterParser({
      searchFields: options?.searchFields || [],
      defaultPageSize: options?.defaultPageSize || 20,
      maxPageSize: options?.maxPageSize || 100,
    });
  }

  /**
   * Parse request parameters and apply filters, search, ordering, and pagination.
   *
   * @param request - The incoming Express request.
   * @param queryset - Current query options.
   * @param _view - Unused view reference.
   * @returns The augmented query options.
   */
  override filterQueryset(
    request: Request,
    queryset: QueryOptions = {},
    _view?: unknown,
  ): QueryOptions {
    const parsed = this.parser.parse(
      request.query as Record<string, string | string[]>,
    );

    // Apply filters
    if (parsed.filters.length > 0) {
      queryset.filter = [...(queryset.filter || []), ...parsed.filters];
    }

    // Apply search
    if (parsed.search) {
      queryset.search = parsed.search;
    }

    // Apply ordering
    if (parsed.ordering) {
      queryset.sort = parsed.ordering;
    }

    // Apply pagination
    queryset.page = parsed.pagination.page;
    queryset.limit = parsed.pagination.pageSize;

    return queryset;
  }

  /**
   * Set searchable fields dynamically.
   *
   * @param fields - Array of field names to search.
   */
  setSearchFields(fields: string[]): void {
    this.parser.setSearchFields(fields);
  }
}

/**
 * Filter backend that handles only text search.
 *
 * Reads the `search` query parameter and builds a
 * {@link SearchOptions} targeting the configured fields.
 *
 * @class SearchFilterBackend
 * @extends {QueryFilterBackend}
 */
@Injectable()
export class SearchFilterBackend extends QueryFilterBackend {
  /** Fields to apply the search query against */
  private searchFields: string[] = [];

  /** Query parameter name (default `'search'`) */
  private searchParam = 'search';

  /**
   * @param searchFields - Optional array of searchable field names.
   */
  constructor(searchFields?: string[]) {
    super();
    if (searchFields) {
      this.searchFields = searchFields;
    }
  }

  /**
   * Apply search from request parameters.
   *
   * @param request - The incoming Express request.
   * @param queryset - Current query options.
   * @param _view - Unused view reference.
   * @returns The augmented query options.
   */
  override filterQueryset(
    request: Request,
    queryset: QueryOptions = {},
    _view?: unknown,
  ): QueryOptions {
    const searchQuery = request.query[this.searchParam] as string;

    if (searchQuery && this.searchFields.length > 0) {
      queryset.search = {
        query: searchQuery,
        fields: this.searchFields,
        fuzzy: true,
      };
    }

    return queryset;
  }

  /**
   * Set searchable fields dynamically.
   *
   * @param fields - Array of field names.
   */
  setSearchFields(fields: string[]): void {
    this.searchFields = fields;
  }
}

/**
 * Filter backend that handles field ordering.
 *
 * Reads the `ordering` query parameter (comma-separated, `-` prefix for
 * descending) and converts it to {@link SortOptions}.
 *
 * @class OrderingFilterBackend
 * @extends {QueryFilterBackend}
 */
@Injectable()
export class OrderingFilterBackend extends QueryFilterBackend {
  /** Allowed ordering fields (empty = all allowed) */
  private orderingFields: string[] = [];

  /** Query parameter name (default `'ordering'`) */
  private orderingParam = 'ordering';

  /** Default ordering applied when no `ordering` param is present */
  private defaultOrdering?: string[];

  /**
   * @param options - Optional ordering configuration.
   */
  constructor(options?: {
    orderingFields?: string[];
    defaultOrdering?: string[];
  }) {
    super();
    if (options?.orderingFields) {
      this.orderingFields = options.orderingFields;
    }
    if (options?.defaultOrdering) {
      this.defaultOrdering = options.defaultOrdering;
    }
  }

  /**
   * Apply ordering from request parameters.
   *
   * @param request - The incoming Express request.
   * @param queryset - Current query options.
   * @param _view - Unused view reference.
   * @returns The augmented query options.
   */
  override filterQueryset(
    request: Request,
    queryset: QueryOptions = {},
    _view?: unknown,
  ): QueryOptions {
    const ordering = request.query[this.orderingParam] as string;

    if (ordering) {
      const sortOptions = this.parseOrdering(ordering);
      if (sortOptions.length > 0) {
        queryset.sort = sortOptions;
      }
    } else if (this.defaultOrdering && !queryset.sort) {
      queryset.sort = this.parseOrdering(this.defaultOrdering.join(','));
    }

    return queryset;
  }

  /**
   * Parse a comma-separated ordering string into sort options.
   *
   * @param ordering - Comma-separated fields, `-` prefix = DESC.
   * @returns Array of {@link SortOptions}.
   */
  private parseOrdering(ordering: string): SortOptions[] {
    const fields = ordering.split(',');
    const sortOptions: SortOptions[] = [];

    for (const field of fields) {
      const trimmed = field.trim();
      if (!trimmed) continue;

      const isDescending = trimmed.startsWith('-');
      const fieldName = isDescending ? trimmed.substring(1) : trimmed;

      // Check if field is allowed
      if (
        this.orderingFields.length === 0 ||
        this.orderingFields.includes(fieldName)
      ) {
        sortOptions.push({
          field: fieldName,
          order: isDescending ? 'DESC' : 'ASC',
        });
      }
    }

    return sortOptions;
  }
}

/**
 * Composite filter backend that chains multiple backends sequentially.
 *
 * Each backend’s output becomes the next backend’s input, allowing
 * independent concerns (filtering, search, ordering) to be composed.
 *
 * @class CompositeFilterBackend
 * @extends {QueryFilterBackend}
 */
@Injectable()
export class CompositeFilterBackend extends QueryFilterBackend {
  /** Ordered list of child backends */
  private backends: QueryFilterBackend[] = [];

  /**
   * @param backends - Initial array of backends to chain.
   */
  constructor(backends: QueryFilterBackend[]) {
    super();
    this.backends = backends;
  }

  /**
   * Run each child backend in sequence over the queryset.
   *
   * @param request - The incoming Express request.
   * @param queryset - Current query options.
   * @param view - Optional view reference forwarded to children.
   * @returns The fully augmented query options.
   */
  override filterQueryset(
    request: Request,
    queryset: QueryOptions = {},
    view?: unknown,
  ): QueryOptions {
    let result = { ...queryset };

    for (const backend of this.backends) {
      result = backend.filterQueryset(request, result, view);
    }

    return result;
  }

  /**
   * Append a backend to the chain.
   *
   * @param backend - Backend to add.
   */
  addBackend(backend: QueryFilterBackend): void {
    this.backends.push(backend);
  }

  /**
   * Remove a backend from the chain.
   *
   * @param backend - Backend to remove.
   */
  removeBackend(backend: IFilterBackend): void {
    const index = this.backends.indexOf(backend as QueryFilterBackend);
    if (index > -1) {
      this.backends.splice(index, 1);
    }
  }
}
