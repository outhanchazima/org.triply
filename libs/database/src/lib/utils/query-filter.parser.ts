/**
 * @fileoverview Query filter parser utility
 * @module database/utils
 * @description Parses query parameters into database filter options.
 * Supports Django-style query lookups and advanced filtering.
 */

import {
  FilterOptions,
  SortOptions,
  FilterOperator,
} from '../interfaces/database.interface';

/**
 * Query lookup suffixes for advanced filtering
 * @const QUERY_LOOKUPS
 * @description Maps Django-style lookup suffixes to filter operators
 * @example
 * ```typescript
 * // Query: ?name__icontains=john&age__gte=18
 * // Parsed to:
 * // [{ field: 'name', operator: 'icontains', value: 'john' },
 * //  { field: 'age', operator: 'gte', value: 18 }]
 * ```
 */
export const QUERY_LOOKUPS = {
  // Comparison
  exact: 'eq',
  iexact: 'ieq',
  contains: 'contains',
  icontains: 'icontains',
  in: 'in',
  gt: 'gt',
  gte: 'gte',
  lt: 'lt',
  lte: 'lte',
  startswith: 'startsWith',
  istartswith: 'istartsWith',
  endswith: 'endsWith',
  iendswith: 'iendsWith',
  range: 'between',
  date: 'date',
  year: 'year',
  month: 'month',
  day: 'day',
  week: 'week',
  week_day: 'weekDay',
  quarter: 'quarter',
  time: 'time',
  hour: 'hour',
  minute: 'minute',
  second: 'second',
  isnull: 'isNull',
  regex: 'regex',
  iregex: 'iregex',
  // Special
  search: 'search',
} as const;

/**
 * Type representing valid query lookup keys
 * @type QueryLookup
 */
export type QueryLookup = keyof typeof QUERY_LOOKUPS;

/**
 * Query parameters from HTTP request
 * @interface QueryFilterParams
 */
export interface QueryFilterParams {
  [key: string]: string | string[] | undefined;
}

/**
 * Parsed query filter result
 * @interface ParsedQueryFilter
 */
export interface ParsedQueryFilter {
  filters: FilterOptions[];
  search?: {
    query: string;
    fields: string[];
  };
  ordering?: SortOptions[];
  pagination: {
    page: number;
    pageSize: number;
    offset: number;
    limit: number;
  };
}

/**
 * Parse advanced query filter parameters
 * Examples:
 * - name__icontains=john
 * - age__gte=18
 */
export class QueryFilterParser {
  /** Parser configuration options */
  private options: QueryFilterParserOptions;

  /**
   * Creates an instance of QueryFilterParser
   * @param options - Parser configuration options
   */
  constructor(options: QueryFilterParserOptions = {}) {
    this.options = {
      defaultPageSize: 20,
      maxPageSize: 100,
      ...options,
    };
  }

  /**
   * Parse query parameters into filter options
   * @param params - Raw query parameters from HTTP request
   * @returns Parsed query filter object with filters, search, ordering, and pagination
   */
  parse(params: QueryFilterParams): ParsedQueryFilter {
    const result: ParsedQueryFilter = {
      filters: [],
      pagination: {
        page: 1,
        pageSize: this.options.defaultPageSize,
        offset: 0,
        limit: this.options.defaultPageSize,
      },
    };

    if (!params || Object.keys(params).length === 0) {
      return result;
    }

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;

      // Handle special parameters
      if (key === 'search') {
        result.search = this.parseSearch(value);
        continue;
      }

      if (key === 'ordering' || key === 'order_by' || key === 'sort') {
        result.ordering = this.parseOrdering(value);
        continue;
      }

      if (key === 'page' || key === 'page_size' || key === 'pageSize') {
        continue; // Handle pagination after loop
      }

      // Parse field filters
      const filter = this.parseFieldFilter(key, value);
      if (filter) {
        result.filters.push(filter);
      }
    }

    // Handle pagination
    const page = params.page ? parseInt(params.page as string, 10) || 1 : 1;
    const pageSize =
      params.page_size || params.pageSize
        ? Math.min(
            parseInt((params.page_size || params.pageSize) as string, 10) ||
              this.options.defaultPageSize,
            this.options.maxPageSize
          )
        : this.options.defaultPageSize;

    result.pagination.page = page;
    result.pagination.pageSize = pageSize;
    result.pagination.offset = (page - 1) * pageSize;
    result.pagination.limit = pageSize;

    return result;
  }

  /**
   * Parse a field filter with advanced lookup
   */
  private parseFieldFilter(
    key: string,
    value: string | string[]
  ): FilterOptions | null {
    // Split by __ to get field and lookup
    const parts = key.split('__');
    const field = parts[0];
    const lookup = parts[1] as QueryLookup | undefined;

    // Default to exact match if no lookup specified
    const operator = lookup ? QUERY_LOOKUPS[lookup] || 'eq' : 'eq';

    // Handle array values for 'in' operator
    if (operator === 'in' && typeof value === 'string') {
      value = value.split(',').map((v) => v.trim());
    }

    // Handle boolean values for isnull
    if (operator === 'isNull') {
      const isNull = this.parseBoolean(value);
      if (isNull) {
        return { field, operator: 'isNull', value: true };
      } else {
        return { field, operator: 'isNotNull', value: true };
      }
    }

    // Handle range/between operator
    if (operator === 'between' && typeof value === 'string') {
      const [start, end] = value.split(',').map((v) => v.trim());
      return { field, operator: 'between', value: [start, end] };
    }

    // Handle case-insensitive operators
    const caseSensitive = !operator.startsWith('i');
    let finalOperator = operator;

    // Map query operators to our internal operators
    switch (operator) {
      case 'ieq':
        finalOperator = 'eq';
        break;
      case 'icontains':
        finalOperator = 'contains';
        break;
      case 'istartsWith':
        finalOperator = 'startsWith';
        break;
      case 'iendsWith':
        finalOperator = 'endsWith';
        break;
      case 'iregex':
        finalOperator = 'regex';
        break;
    }

    return {
      field,
      operator: finalOperator as FilterOperator,
      value: Array.isArray(value) ? value : value,
      caseSensitive: operator.startsWith('i') ? false : caseSensitive,
    };
  }

  /**
   * Parse search parameter
   */
  private parseSearch(value: string | string[]): {
    query: string;
    fields: string[];
  } {
    const query = Array.isArray(value) ? value[0] : value;
    return {
      query,
      fields: this.options.searchFields || [],
    };
  }

  /**
   * Parse ordering parameter
   * Examples: -created_at,name or ["-created_at", "name"]
   */
  private parseOrdering(value: string | string[]): SortOptions[] {
    const orders = Array.isArray(value) ? value : value.split(',');

    return orders.map((order) => {
      const trimmed = order.trim();
      if (trimmed.startsWith('-')) {
        return {
          field: trimmed.substring(1),
          order: 'DESC',
        };
      }
      return {
        field: trimmed.startsWith('+') ? trimmed.substring(1) : trimmed,
        order: 'ASC',
      };
    });
  }

  /**
   * Parse number value
   */
  private parseNumber(value: string | string[], defaultValue: number): number {
    const str = Array.isArray(value) ? value[0] : value;
    const num = parseInt(str, 10);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Parse boolean value
   */
  private parseBoolean(value: string | string[]): boolean {
    const str = Array.isArray(value) ? value[0] : value;
    return str === 'true' || str === '1' || str === 'True';
  }

  /**
   * Check if field is allowed for filtering
   * @private
   * @param field - Field name to check
   * @returns True if field is allowed, false otherwise
   */
  private isFieldAllowed(field: string): boolean {
    if (this.options.allowedFields) {
      return this.options.allowedFields.includes(field);
    }
    if (this.options.excludedFields) {
      return !this.options.excludedFields.includes(field);
    }
    return true;
  }
}

/**
 * Create filter options from query string
 * Example: "?name__icontains=john&age__gte=18&ordering=-created_at"
 */
export function parseQueryString(
  queryString: string,
  options?: QueryFilterParserOptions
): ParsedQueryFilter {
  const params: QueryFilterParams = {};
  const urlParams = new URLSearchParams(queryString);

  urlParams.forEach((value, key) => {
    if (params[key]) {
      // Handle multiple values for the same key
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });

  const parser = new QueryFilterParser(options);
  return parser.parse(params);
}

/**
 * Build query string from filter options
 */
export function buildQueryString(options: {
  filters?: FilterOptions[];
  search?: { query: string; fields: string[] };
  ordering?: SortOptions[];
  page?: number;
  pageSize?: number;
}): string {
  const params = new URLSearchParams();

  // Add filters
  if (options.filters) {
    for (const filter of options.filters) {
      const lookup =
        Object.entries(QUERY_LOOKUPS).find(
          ([, value]) => value === filter.operator
        )?.[0] || 'exact';

      const key =
        filter.operator === 'eq' ? filter.field : `${filter.field}__${lookup}`;

      if (Array.isArray(filter.value)) {
        params.append(key, filter.value.join(','));
      } else {
        params.append(key, String(filter.value));
      }
    }
  }

  // Add search
  if (options.search?.query) {
    params.append('search', options.search.query);
  }

  // Add ordering
  if (options.ordering?.length) {
    const ordering = options.ordering
      .map((o) => (o.order === 'DESC' ? '-' : '') + o.field)
      .join(',');
    params.append('ordering', ordering);
  }

  // Add pagination
  if (options.page) {
    params.append('page', String(options.page));
  }
  if (options.pageSize) {
    params.append('page_size', String(options.pageSize));
  }

  return params.toString();
}
