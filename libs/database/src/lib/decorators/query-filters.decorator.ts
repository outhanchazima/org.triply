/**
 * @fileoverview Query filter decorators for NestJS controllers
 * @module database/decorators
 * @description Provides decorators for handling query parameters including filtering,
 * searching, sorting, and pagination. Inspired by Django REST Framework patterns.
 */

import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { QueryFilterParser } from '../utils/query-filter.parser';

/**
 * Metadata key for query filter configuration
 * @const {string}
 */
export const QUERY_FILTER_METADATA = 'query:filter:metadata';

/**
 * Query filter configuration interface
 * @interface QueryFilterConfig
 * @description Configuration options for query filtering behavior
 */
export interface QueryFilterConfig {
  /** Fields that can be searched with full-text search */
  searchFields?: string[];

  /** Allowed filter fields and their operators */
  filterFields?: Record<string, string[]>;

  /** Fields that can be used for ordering/sorting */
  orderingFields?: string[];

  /** Default ordering if none specified */
  defaultOrdering?: string[];

  /** Default page size for pagination (default: 20) */
  defaultPageSize?: number;

  /** Maximum allowed page size (default: 100) */
  maxPageSize?: number;
}

/**
 * Class/method decorator to configure advanced query filtering
 * @decorator QueryFilter
 * @param config - Query filter configuration
 * @returns Method decorator
 * @example
 * ```typescript
 * @Controller('users')
 * @QueryFilter({
 *   searchFields: ['name', 'email', 'bio'],
 *   filterFields: {
 *     age: ['gte', 'lte'],
 *     status: ['eq', 'in'],
 *   },
 *   orderingFields: ['name', 'createdAt'],
 *   defaultOrdering: ['-createdAt'],
 *   defaultPageSize: 25,
 *   maxPageSize: 100
 * })
 * export class UserController {
 *   // ...
 * }
 * ```
 */
export const QueryFilter = (config: QueryFilterConfig) => {
  return SetMetadata(QUERY_FILTER_METADATA, config);
};

/**
 * Parameter decorator to inject parsed query filters
 * @decorator QueryFilters
 * @param data - Optional query filter configuration
 * @returns Parsed filter options from query parameters
 * @example
 * ```typescript
 * @Get()
 * async findAll(@QueryFilters() filters: FilterOptions[]) {
 *   return this.service.findMany({ filter: filters });
 * }
 * ```
 */
export const QueryFilters = createParamDecorator(
  (data: QueryFilterConfig | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();

    const parser = new QueryFilterParser({
      searchFields: data?.searchFields,
      defaultPageSize: data?.defaultPageSize || 20,
      maxPageSize: data?.maxPageSize || 100,
    });

    return parser.parse(request.query as Record<string, string | string[]>)
      .filters;
  }
);

/**
 * Parameter decorator to inject search query parameters
 * @decorator SearchQuery
 * @param data - Optional array of fields to search
 * @returns Search query object with query string and fields
 * @example
 * ```typescript
 * @Get('search')
 * async search(
 *   @SearchQuery(['name', 'description']) search: SearchOptions
 * ) {
 *   return this.service.search(search);
 * }
 * ```
 */
export const SearchQuery = createParamDecorator(
  (data: string[] | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const searchQuery = request.query.search as string | undefined;

    if (!searchQuery) {
      return null;
    }

    return {
      query: searchQuery,
      fields: data || [],
    };
  }
);

/**
 * Parameter decorator to inject ordering/sorting parameters
 * @decorator Ordering
 * @returns Array of sort options parsed from query parameters
 * @example
 * ```typescript
 * @Get()
 * async findAll(@Ordering() sort: SortOptions[]) {
 *   // Query: ?ordering=-createdAt,name
 *   // Result: [{ field: 'createdAt', order: 'DESC' }, { field: 'name', order: 'ASC' }]
 *   return this.service.findMany({ sort });
 * }
 * ```
 */
export const Ordering = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const ordering = request.query.ordering as string | undefined;

    if (!ordering) {
      return [];
    }

    return ordering.split(',').map((field) => {
      const trimmed = field.trim();
      if (trimmed.startsWith('-')) {
        return {
          field: trimmed.substring(1),
          order: 'DESC',
        };
      }
      return {
        field: trimmed,
        order: 'ASC',
      };
    });
  }
);

/**
 * Parameter decorator to inject pagination parameters
 * @decorator Pagination
 * @param data - Optional pagination configuration
 * @returns Pagination object with page, pageSize, offset, and limit
 * @example
 * ```typescript
 * @Get()
 * async findAll(
 *   @Pagination({ defaultPageSize: 25, maxPageSize: 100 }) pagination: PaginationParams
 * ) {
 *   // Query: ?page=2&page_size=25
 *   // Result: { page: 2, pageSize: 25, offset: 25, limit: 25 }
 *   return this.service.findMany({
 *     page: pagination.page,
 *     limit: pagination.pageSize
 *   });
 * }
 * ```
 */
export const Pagination = createParamDecorator(
  (
    data: { defaultPageSize?: number; maxPageSize?: number } | undefined,
    ctx: ExecutionContext
  ) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const defaultPageSize = data?.defaultPageSize || 20;
    const maxPageSize = data?.maxPageSize || 100;

    const page = parseInt(request.query.page as string) || 1;
    const pageSize = Math.min(
      parseInt(request.query.page_size as string) || defaultPageSize,
      maxPageSize
    );

    return {
      page,
      pageSize,
      offset: (page - 1) * pageSize,
      limit: pageSize,
    };
  }
);

/**
 * Combined parameter decorator to inject all parsed query parameters
 * @decorator ParsedQuery
 * @param data - Optional query filter configuration
 * @returns Object containing filters, search, ordering, and pagination
 * @example
 * ```typescript
 * @Get()
 * async findAll(@ParsedQuery() query: ParsedQueryResult) {
 *   const { filters, search, ordering, pagination } = query;
 *   return this.service.findMany({
 *     filter: filters,
 *     search,
 *     sort: ordering,
 *     page: pagination.page,
 *     limit: pagination.pageSize
 *   });
 * }
 * ```
 */
export const ParsedQuery = createParamDecorator(
  (data: QueryFilterConfig | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const parser = new QueryFilterParser({
      searchFields: data?.searchFields,
      defaultPageSize: data?.defaultPageSize || 20,
      maxPageSize: data?.maxPageSize || 100,
    });
    return parser.parse(request.query as Record<string, string | string[]>);
  }
);

/**
 * Alias for backward compatibility
 * @deprecated Use ParsedQuery instead
 */
export const DRFQuery = ParsedQuery;

/**
 * Alias for backward compatibility
 * @deprecated Use QueryFilters instead
 */
export const DjangoFilters = QueryFilters;

/**
 * Alias for backward compatibility
 * @deprecated Use QueryFilter instead
 */
export const DRFFilter = QueryFilter;
