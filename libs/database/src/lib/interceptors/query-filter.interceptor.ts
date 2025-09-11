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
  QueryFilterBackend,
} from '../filters/query-filter.backend';
import { QueryOptions } from '../interfaces/database.interface';
import { Reflector } from '@nestjs/core';

/**
 * Interceptor to apply advanced query filtering to responses
 */
@Injectable()
export class QueryFilterInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
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

    const parser = new QueryFilterParser();
    const parsed = parser.parse(
      request.query as Record<string, string | string[]>
    );

    // Create filter backend
    const backend = new CompositeFilterBackend([
      new DRFFilterBackend(filterConfig),
      new SearchFilterBackend(filterConfig.searchFields),
      new OrderingFilterBackend({
        orderingFields: filterConfig.orderingFields,
        defaultOrdering: filterConfig.defaultOrdering,
      }),
      new FieldFilterBackend(filterConfig.filterFields),
    ]);

    // Apply filters to query options
    const queryOptions: QueryOptions = {};
    const filteredOptions = backend.filterQueryset(request, queryOptions);

    // Attach filtered options to request for use in controller
    (request as any).drfFilters = filteredOptions;

    return next.handle().pipe(
      map((data) => {
        // If the response is a pagination result, add metadata
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'pagination' in data
        ) {
          return {
            ...data,
            filters: filteredOptions.filter,
            search: filteredOptions.search,
            ordering: filteredOptions.sort,
            page: parsed.pagination.page,
            pageSize: parsed.pagination.pageSize,
            totalPages: Math.ceil(data.total / parsed.pagination.pageSize),
          };
        }
        return data;
      })
    );
  }
}

/**
 * Request interface with DRF filters attached
 */
export interface DRFRequest extends Request {
  drfFilters?: QueryOptions;
}
