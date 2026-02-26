/**
 * @fileoverview Django REST Framework–style FilterSet for NestJS
 * @module database/filters
 * @description Declarative filter configuration inspired by django-filter's
 * FilterSet. Define allowed fields, lookups, search fields, ordering fields,
 * default ordering, and pagination in a single class — then attach it to a
 * controller with {@link ApiFilters}.
 *
 * @example
 * ```typescript
 * // ── Define a FilterSet ────────────────────────
 * class UserFilterSet extends FilterSet {
 *   override readonly filterFields = {
 *     status:    ['exact', 'in'],
 *     age:       ['exact', 'gte', 'lte', 'range'],
 *     role:      ['exact', 'in'],
 *     is_active: ['isnull'],
 *   };
 *   override readonly searchFields  = ['name', 'email', 'bio'];
 *   override readonly orderingFields = ['name', 'createdAt', 'email'];
 *   override readonly defaultOrdering = ['-createdAt'];
 *   override readonly pageSize = 25;
 *   override readonly maxPageSize = 100;
 * }
 *
 * // ── Use it on a controller ────────────────────
 * @Controller('users')
 * @ApiFilters(UserFilterSet)
 * export class UserController {
 *   @Get()
 *   findAll(@Filtered() query: QueryOptions) {
 *     return this.userService.findMany(query);
 *   }
 * }
 * ```
 *
 * Supported query parameters (same conventions as DRF + django-filter):
 *
 * | Query param             | Example                                |
 * |-------------------------|----------------------------------------|
 * | `field=value`           | `?status=active`       (exact)         |
 * | `field__lookup=value`   | `?age__gte=18`                         |
 * | `field__in=a,b,c`       | `?status__in=active,pending`           |
 * | `field__range=lo,hi`    | `?age__range=18,65`                    |
 * | `field__icontains=text` | `?name__icontains=john`                |
 * | `search=text`           | `?search=john`                         |
 * | `ordering=f1,-f2`       | `?ordering=name,-createdAt`            |
 * | `page=N`                | `?page=2`                              |
 * | `page_size=N`           | `?page_size=50`                        |
 */

import {
  FilterOptions,
  FilterOperator,
  SortOptions,
  QueryOptions,
  SearchOptions,
} from '../interfaces/database.interface';
import { QUERY_LOOKUPS, QueryLookup } from '../utils/query-filter.parser';

// ── Types ──────────────────────────────────────────────────

/** Lookup strings the developer can use when declaring `filterFields`. */
export type DeclaredLookup = QueryLookup | 'exact';

/** Shape of the `filterFields` property. */
export type FilterFieldsMap = Record<string, DeclaredLookup[]>;

/** Result returned by {@link FilterSet.apply}. */
export interface FilterSetResult {
  filter: FilterOptions[];
  search?: SearchOptions;
  sort?: SortOptions[];
  page: number;
  limit: number;
}

// ── FilterSet ──────────────────────────────────────────────

/**
 * Base FilterSet class — subclass it to declare your per-resource config,
 * or pass a plain object to {@link ApiFilters} and one will be created for you.
 */
export class FilterSet {
  /**
   * Allowed filter fields and their permitted lookups.
   *
   * ```ts
   * readonly filterFields = {
   *   status: ['exact', 'in'],
   *   age:    ['exact', 'gte', 'lte', 'range'],
   * };
   * ```
   *
   * If empty or `undefined`, **no** field filters are applied (whitelist model).
   */
  readonly filterFields: FilterFieldsMap = {};

  /**
   * Fields included in full-text `?search=` queries.
   * If empty, the search parameter is ignored.
   */
  readonly searchFields: string[] = [];

  /**
   * Fields the client is allowed to sort by via `?ordering=`.
   * An empty array means **all** fields are allowed.
   */
  readonly orderingFields: string[] = [];

  /**
   * Default ordering applied when the client doesn't provide `?ordering=`.
   * Prefix with `-` for descending, e.g. `['-createdAt']`.
   */
  readonly defaultOrdering: string[] = [];

  /** Default page size. */
  readonly pageSize: number = 20;

  /** Maximum page size the client can request. */
  readonly maxPageSize: number = 100;

  // ── Public API ──────────────────────────────────────

  /**
   * Parse raw query parameters and return a {@link FilterSetResult}
   * that can be spread straight into a repository's `findMany()` call.
   */
  apply(query: Record<string, string | string[] | undefined>): FilterSetResult {
    const result: FilterSetResult = {
      filter: [],
      page: 1,
      limit: this.pageSize,
    };

    if (!query || Object.keys(query).length === 0) return result;

    // ── Filters ────────────────────────────────────
    for (const [key, raw] of Object.entries(query)) {
      if (raw === undefined) continue;
      if (this.isReservedParam(key)) continue;

      const value = Array.isArray(raw) ? raw[0] : raw;
      const filter = this.parseFilter(key, value);
      if (filter) result.filter.push(filter);
    }

    // ── Search ─────────────────────────────────────
    const searchRaw = query['search'];
    if (searchRaw && this.searchFields.length > 0) {
      const searchQuery = Array.isArray(searchRaw) ? searchRaw[0] : searchRaw;
      result.search = {
        query: searchQuery,
        fields: this.searchFields,
        fuzzy: true,
      };
    }

    // ── Ordering ───────────────────────────────────
    const orderingRaw = query['ordering'] || query['order_by'] || query['sort'];
    if (orderingRaw) {
      const orderingStr = Array.isArray(orderingRaw)
        ? orderingRaw[0]
        : orderingRaw;
      result.sort = this.parseOrdering(orderingStr);
    } else if (this.defaultOrdering.length > 0) {
      result.sort = this.parseOrdering(this.defaultOrdering.join(','));
    }

    // ── Pagination ─────────────────────────────────
    const page = this.toInt(query['page'], 1);
    const requestedSize = this.toInt(
      query['page_size'] || query['pageSize'],
      this.pageSize,
    );
    const limit = Math.min(Math.max(1, requestedSize), this.maxPageSize);

    result.page = Math.max(1, page);
    result.limit = limit;

    return result;
  }

  /**
   * Convert a {@link FilterSetResult} into a {@link QueryOptions} object
   * that can be passed directly to service / repository methods.
   */
  toQueryOptions(result: FilterSetResult): QueryOptions {
    const opts: QueryOptions = {
      filter: result.filter.length > 0 ? result.filter : undefined,
      search: result.search,
      sort: result.sort,
      page: result.page,
      limit: result.limit,
    };
    return opts;
  }

  /**
   * Shorthand: parse query params **and** return a `QueryOptions` in one call.
   */
  applyToQuery(
    query: Record<string, string | string[] | undefined>,
  ): QueryOptions {
    return this.toQueryOptions(this.apply(query));
  }

  // ── Internals ───────────────────────────────────────

  private isReservedParam(key: string): boolean {
    return [
      'search',
      'ordering',
      'order_by',
      'sort',
      'page',
      'page_size',
      'pageSize',
      'format',
    ].includes(key);
  }

  private parseFilter(key: string, value: string): FilterOptions | null {
    const parts = key.split('__');
    const field = parts[0];
    const lookupStr = (parts[1] || 'exact') as DeclaredLookup;

    // Whitelist check
    const allowed = this.filterFields[field];
    if (!allowed) return null;
    if (!allowed.includes(lookupStr)) return null;

    // Map lookup to internal operator
    const operator: string =
      lookupStr === 'exact'
        ? 'eq'
        : QUERY_LOOKUPS[lookupStr as QueryLookup] || 'eq';

    // ── Operator-specific value coercion ──
    switch (operator) {
      case 'in': {
        const items = value.split(',').map((v) => v.trim());
        return { field, operator: 'in', value: items };
      }

      case 'between': {
        const [lo, hi] = value.split(',').map((v) => v.trim());
        return { field, operator: 'between', value: [lo, hi] };
      }

      case 'isNull': {
        const isNull = value === 'true' || value === '1' || value === 'True';
        return isNull
          ? { field, operator: 'isNull', value: true }
          : { field, operator: 'isNotNull', value: true };
      }

      default: {
        // Handle case-insensitive variants
        let finalOp = operator;
        let caseSensitive = true;
        switch (operator) {
          case 'ieq':
            finalOp = 'eq';
            caseSensitive = false;
            break;
          case 'icontains':
            finalOp = 'contains';
            caseSensitive = false;
            break;
          case 'istartsWith':
            finalOp = 'startsWith';
            caseSensitive = false;
            break;
          case 'iendsWith':
            finalOp = 'endsWith';
            caseSensitive = false;
            break;
          case 'iregex':
            finalOp = 'regex';
            caseSensitive = false;
            break;
        }
        return {
          field,
          operator: finalOp as FilterOperator,
          value,
          caseSensitive,
        };
      }
    }
  }

  private parseOrdering(raw: string): SortOptions[] {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((token) => {
        const desc = token.startsWith('-');
        const fieldName = desc ? token.substring(1) : token.replace(/^\+/, '');

        // Whitelist check (empty = allow all)
        if (
          this.orderingFields.length > 0 &&
          !this.orderingFields.includes(fieldName)
        ) {
          return null;
        }

        return {
          field: fieldName,
          order: desc ? 'DESC' : 'ASC',
        } as SortOptions;
      })
      .filter((s): s is SortOptions => s !== null);
  }

  private toInt(val: string | string[] | undefined, fallback: number): number {
    if (val === undefined) return fallback;
    const str = Array.isArray(val) ? val[0] : val;
    const n = parseInt(str, 10);
    return isNaN(n) ? fallback : n;
  }
}
