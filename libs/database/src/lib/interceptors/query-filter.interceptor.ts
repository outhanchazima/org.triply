/**
 * @fileoverview NestJS interceptor for automatic query filtering
 * @module database/interceptors
 * @description Reads {@link QueryFilterConfig} metadata attached by the
 * `@QueryFilters` decorator and applies a composite filter backend to
 * every incoming request. Parsed filter/search/sort options are stored
 * on `request.drfFilters` and, if the response is a paginated result,
 * extra metadata (filters, ordering, page info) is appended.
 *
 * @author Outhan Chazima
 * @version 1.0.0
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { QueryFilterParser } from '../utils/query-filter.parser';
import {
  QUERY_FILTER_METADATA,
  QueryFilterConfig,
} from '../decorators/query-filters.decorator';
import {
  CompositeFilterBackend,
  MainQueryFilterBackend,
  SearchFilterBackend,
  OrderingFilterBackend,
} from '../filters/query-filter.backend';
import { QueryOptions } from '../interfaces/database.interface';

/**
 * Interceptor that automatically applies query filtering, search, and
 * ordering based on metadata from `@QueryFilters` decorator.
 *
 * @class QueryFilterInterceptor
 * @implements {NestInterceptor}
 * @description When a handler or controller is decorated with
 * `@QueryFilters(config)`, this interceptor:
 * 1. Builds a composite filter backend from the config.
 * 2. Parses the request query parameters.
 * 3. Attaches the parsed options to `request.drfFilters`.
 * 4. Enriches paginated responses with filter metadata.
 *
 * If no `@QueryFilters` metadata is present, the interceptor is a no-op.
 *
 * @example
 * ```typescript
 * @UseInterceptors(QueryFilterInterceptor)
 * @QueryFilters({ searchFields: ['name', 'email'], orderingFields: ['createdAt'] })
 * @Get()
 * findAll(@Req() req: DRFRequest) {
 *   return this.service.findAll(req.drfFilters);
 * }
 * ```
 */
@Injectable()
export class QueryFilterInterceptor implements NestInterceptor {
  /**
   * Intercept the request, apply query filtering, and enrich the response.
   *
   * @param context - NestJS execution context.
   * @param next - Call handler for the next interceptor or route handler.
   * @returns An observable of the (potentially enriched) response.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    // Get query filter configuration from metadata
    const filterConfig =
      Reflect.getMetadata(QUERY_FILTER_METADATA, context.getHandler()) ||
      (Reflect.getMetadata(QUERY_FILTER_METADATA, context.getClass()) as
        | QueryFilterConfig
        | undefined);

    if (!filterConfig) {
      return next.handle();
    }

    const parser = new QueryFilterParser({
      searchFields: filterConfig.searchFields,
      defaultPageSize: filterConfig.defaultPageSize,
      maxPageSize: filterConfig.maxPageSize,
    });
    const parsed = parser.parse(
      request.query as Record<string, string | string[]>,
    );

    // Create composite filter backend from config
    const backend = new CompositeFilterBackend([
      new MainQueryFilterBackend({
        searchFields: filterConfig.searchFields,
        defaultPageSize: filterConfig.defaultPageSize,
        maxPageSize: filterConfig.maxPageSize,
      }),
      new SearchFilterBackend(filterConfig.searchFields),
      new OrderingFilterBackend({
        orderingFields: filterConfig.orderingFields,
        defaultOrdering: filterConfig.defaultOrdering,
      }),
    ]);

    // Apply filters to query options
    const queryOptions: QueryOptions = {};
    const filteredOptions = backend.filterQueryset(request, queryOptions);

    // Attach filtered options to request for use in controller
    (request as any).drfFilters = filteredOptions;

    return next.handle().pipe(
      map((data: unknown) => {
        // If the response is a pagination result, add metadata
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'pagination' in data
        ) {
          const paginatedData = data as Record<string, unknown>;
          return {
            ...paginatedData,
            filters: filteredOptions.filter,
            search: filteredOptions.search,
            ordering: filteredOptions.sort,
            page: parsed.pagination.page,
            pageSize: parsed.pagination.pageSize,
            totalPages: Math.ceil(
              (paginatedData.total as number) / parsed.pagination.pageSize,
            ),
          };
        }
        return data;
      }),
    );
  }
}

/**
 * Extended Express `Request` with parsed DRF-style filter options.
 *
 * @export
 * @interface DRFRequest
 * @extends {Request}
 * @description Attached by the {@link QueryFilterInterceptor} so that
 * controller methods can access the parsed filter, search, sort, and
 * pagination options via `request.drfFilters`.
 */
export interface DRFRequest extends Request {
  /** Parsed query options from the interceptor */
  drfFilters?: QueryOptions;
}
