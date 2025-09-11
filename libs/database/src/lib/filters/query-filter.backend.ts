import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import {
  FilterOptions,
  SortOptions,
  QueryOptions,
} from '../interfaces/database.interface';
import {
  QueryFilterParser,
  ParsedQueryFilter,
} from '../utils/query-filter.parser';

/**
 * Filter backend interface similar to Django REST Framework
 */
export interface IFilterBackend {
  filterQueryset<T>(
    request: Request,
    queryset: QueryOptions,
    view?: any
  ): QueryOptions;
}

/**
 * Main query filter backend implementation
 */
@Injectable()
export class MainQueryFilterBackend extends QueryFilterBackend<any> {
  private parser: QueryFilterParser;

  constructor(options?: {
    searchFields?: string[];
    filterFields?: string[];
    orderingFields?: string[];
    defaultPageSize?: number;
    maxPageSize?: number;
  }) {
    this.parser = new QueryFilterParser({
      searchFields: options?.searchFields || [],
      defaultPageSize: options?.defaultPageSize || 20,
      maxPageSize: options?.maxPageSize || 100,
    });
  }

  /**
   * Filter queryset based on request parameters
   */
  filterQueryset<T>(
    request: Request,
    queryset: QueryOptions = {},
    view?: any
  ): QueryOptions {
    const parsed = this.parser.parse(request.query as any);

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
    if (parsed.page) {
      queryset.page = parsed.page;
    }
    if (parsed.pageSize) {
      queryset.limit = parsed.pageSize;
    }

    return queryset;
  }

  /**
   * Set search fields dynamically
   */
  setSearchFields(fields: string[]): void {
    this.parser.setSearchFields(fields);
  }
}

/**
 * Search filter backend
 */
@Injectable()
export class SearchFilterBackend extends QueryFilterBackend<any> {
  private searchFields: string[] = [];
  private searchParam = 'search';

  constructor(searchFields?: string[]) {
    if (searchFields) {
      this.searchFields = searchFields;
    }
  }

  filterQueryset<T>(
    request: Request,
    queryset: QueryOptions = {},
    view?: any
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

  setSearchFields(fields: string[]): void {
    this.searchFields = fields;
  }
}

/**
 * Ordering filter backend
 */
@Injectable()
export class OrderingFilterBackend extends QueryFilterBackend<any> {
  private orderingFields: string[] = [];
  private orderingParam = 'ordering';
  private defaultOrdering?: string[];

  constructor(options?: {
    orderingFields?: string[];
    defaultOrdering?: string[];
  }) {
    if (options?.orderingFields) {
      this.orderingFields = options.orderingFields;
    }
    if (options?.defaultOrdering) {
      this.defaultOrdering = options.defaultOrdering;
    }
  }

  filterQueryset<T>(
    request: Request,
    queryset: QueryOptions = {},
    view?: any
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
 * Base filter backend for advanced query filtering
 */
export abstract class QueryFilterBackend<T = any> implements IFilterBackend {
  private filterFields: Map<string, string[]> = new Map();

  constructor(filterFields?: Record<string, string[]>) {
    if (filterFields) {
      Object.entries(filterFields).forEach(([field, lookups]) => {
        this.filterFields.set(field, lookups);
      });
    }
  }

  abstract filter(queryset: T, request: Request, view?: unknown): T;

  filterQueryset<T>(
    request: Request,
    queryset: QueryOptions = {},
    view?: any
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

  private createFilter(
    field: string,
    lookup: string,
    value: string
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

  setFilterFields(field: string, lookups: string[]): void {
    this.filterFields.set(field, lookups);
  }
}

/**
 * Composite filter backend that combines multiple backends
 */
@Injectable()
export class CompositeFilterBackend extends QueryFilterBackend<any> {
  private backends: QueryFilterBackend<any>[] = [];

  constructor(backends: QueryFilterBackend<any>[]) {
    this.backends = backends;
  }

  filterQueryset<T>(
    request: Request,
    queryset: QueryOptions = {},
    view?: any
  ): QueryOptions {
    let result = { ...queryset };

    for (const backend of this.backends) {
      result = backend.filterQueryset(request, result, view);
    }

    return result;
  }

  addBackend(backend: QueryFilterBackend<any>): void {
    this.backends.push(backend);
  }

  removeBackend(backend: IFilterBackend): void {
    const index = this.backends.indexOf(backend);
    if (index > -1) {
      this.backends.splice(index, 1);
    }
  }
}
