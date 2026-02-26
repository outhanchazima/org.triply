/**
 * @fileoverview DRF-style controller decorators for query filtering
 * @module database/decorators
 * @description Provides `@ApiFilters()` class/method decorator and `@Filtered()`
 * parameter decorator that together give a Django REST Framework–like experience
 * for NestJS controllers — including **automatic Swagger documentation**.
 *
 * `@ApiFilters()` generates `@ApiQuery()` entries for every declared filter
 * field + lookup, search, ordering, and pagination parameters so they appear
 * in Swagger UI without any extra work.
 *
 * @example
 * ```typescript
 * // ── Option 1: Inline config (quick & simple) ──────────
 * @Controller('flights')
 * export class FlightController {
 *   constructor(private readonly flights: FlightService) {}
 *
 *   @Get()
 *   @ApiFilters({
 *     filterFields: {
 *       origin:      ['exact', 'in'],
 *       destination: ['exact', 'in'],
 *       price:       ['gte', 'lte', 'range'],
 *       airline:     ['exact', 'icontains'],
 *       departureAt: ['gte', 'lte', 'range'],
 *     },
 *     searchFields:   ['origin', 'destination', 'airline'],
 *     orderingFields: ['price', 'departureAt', 'duration'],
 *     defaultOrdering: ['-departureAt'],
 *     pageSize: 25,
 *     maxPageSize: 100,
 *   })
 *   findAll(@Filtered() query: QueryOptions) {
 *     return this.flights.findMany(query);
 *   }
 * }
 *
 * // ── Option 2: Reusable FilterSet class ────────────────
 * class FlightFilterSet extends FilterSet {
 *   override readonly filterFields = {
 *     origin:      ['exact', 'in'],
 *     destination: ['exact', 'in'],
 *     price:       ['gte', 'lte', 'range'],
 *   };
 *   override readonly searchFields   = ['origin', 'destination'];
 *   override readonly orderingFields = ['price', 'departureAt'];
 *   override readonly defaultOrdering = ['-departureAt'];
 * }
 *
 * @Controller('flights')
 * export class FlightController {
 *   @Get()
 *   @ApiFilters(FlightFilterSet)
 *   findAll(@Filtered() query: QueryOptions) {
 *     return this.flights.findMany(query);
 *   }
 * }
 * ```
 *
 * Query examples that work out of the box:
 * ```
 * GET /flights?origin=NBO&destination__in=LLW,BLZ&price__lte=500
 * GET /flights?search=nairobi&ordering=-price&page=2&page_size=10
 * GET /flights?departureAt__gte=2026-03-01&departureAt__lte=2026-03-31
 * ```
 *
 * All of the above will appear in Swagger UI automatically.
 */

import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import {
  FilterSet,
  FilterFieldsMap,
  DeclaredLookup,
} from '../filters/filterset';
import { QueryOptions } from '../interfaces/database.interface';

// ── Metadata key ──────────────────────────────────────────

export const API_FILTERS_METADATA = 'api:filters:metadata';

// ── Config types ──────────────────────────────────────────

/**
 * Inline configuration object accepted by {@link ApiFilters}.
 * Same shape as {@link FilterSet} properties, so you don't need a class
 * for simple cases.
 */
export interface ApiFiltersConfig {
  /** Allowed filter fields and their lookups (whitelist). */
  filterFields?: FilterFieldsMap;
  /** Fields included in `?search=` full-text queries. */
  searchFields?: string[];
  /** Fields the client may sort by via `?ordering=`. */
  orderingFields?: string[];
  /** Default ordering when `?ordering=` is absent. Prefix `-` for DESC. */
  defaultOrdering?: string[];
  /** Default page size (default: 20). */
  pageSize?: number;
  /** Maximum page size the client may request (default: 100). */
  maxPageSize?: number;
}

/** Input accepted by the `@ApiFilters()` decorator. */
export type ApiFiltersInput = ApiFiltersConfig | (new () => FilterSet);

// ── Lookup → Swagger description map ──────────────────────

const LOOKUP_DESCRIPTIONS: Record<string, string> = {
  exact: 'Exact match',
  iexact: 'Case-insensitive exact match',
  contains: 'Contains (case-sensitive)',
  icontains: 'Contains (case-insensitive)',
  in: 'One of (comma-separated)',
  gt: 'Greater than',
  gte: 'Greater than or equal to',
  lt: 'Less than',
  lte: 'Less than or equal to',
  startswith: 'Starts with',
  istartswith: 'Starts with (case-insensitive)',
  endswith: 'Ends with',
  iendswith: 'Ends with (case-insensitive)',
  range: 'Between min,max (comma-separated)',
  isnull: 'Is null (true/false)',
  regex: 'Regex pattern',
  iregex: 'Regex pattern (case-insensitive)',
  date: 'Date filter',
  year: 'Year filter',
  month: 'Month filter',
  day: 'Day filter',
  week: 'Week filter',
  week_day: 'Weekday filter',
  quarter: 'Quarter filter',
  time: 'Time filter',
  hour: 'Hour filter',
  minute: 'Minute filter',
  second: 'Second filter',
};

const LOOKUP_SWAGGER_TYPE: Record<string, string> = {
  gt: 'number',
  gte: 'number',
  lt: 'number',
  lte: 'number',
  year: 'integer',
  month: 'integer',
  day: 'integer',
  hour: 'integer',
  minute: 'integer',
  second: 'integer',
  quarter: 'integer',
  week: 'integer',
  week_day: 'integer',
  isnull: 'boolean',
};

// ── Swagger @ApiQuery generator ───────────────────────────

function buildSwaggerDecorators(config: ApiFiltersConfig): MethodDecorator[] {
  const decorators: MethodDecorator[] = [];

  // ── Filter field query params ─────────────────────
  if (config.filterFields) {
    for (const [field, lookups] of Object.entries(config.filterFields)) {
      for (const lookup of lookups as DeclaredLookup[]) {
        const paramName = lookup === 'exact' ? field : `${field}__${lookup}`;
        const desc = LOOKUP_DESCRIPTIONS[lookup] || lookup;
        const swaggerType = LOOKUP_SWAGGER_TYPE[lookup];

        const queryDef: Record<string, unknown> = {
          name: paramName,
          required: false,
          description: `Filter \`${field}\`: ${desc}`,
          example:
            lookup === 'in'
              ? 'value1,value2'
              : lookup === 'range'
                ? 'min,max'
                : lookup === 'isnull'
                  ? 'true'
                  : undefined,
        };

        if (swaggerType === 'boolean') {
          queryDef.type = Boolean;
        } else if (swaggerType === 'number' || swaggerType === 'integer') {
          queryDef.type = Number;
        } else {
          queryDef.type = String;
        }

        decorators.push(ApiQuery(queryDef as any));
      }
    }
  }

  // ── Search query param ────────────────────────────
  if (config.searchFields && config.searchFields.length > 0) {
    decorators.push(
      ApiQuery({
        name: 'search',
        required: false,
        type: String,
        description: `Full-text search across: ${config.searchFields.join(', ')}`,
        example: 'search term',
      }),
    );
  }

  // ── Ordering query param ──────────────────────────
  if (config.orderingFields && config.orderingFields.length > 0) {
    const defaultNote = config.defaultOrdering?.length
      ? ` Default: \`${config.defaultOrdering.join(',')}\`.`
      : '';
    decorators.push(
      ApiQuery({
        name: 'ordering',
        required: false,
        type: String,
        description:
          `Sort by: ${config.orderingFields.join(', ')}. ` +
          `Prefix with \`-\` for descending.${defaultNote}`,
        example:
          config.defaultOrdering?.join(',') || `-${config.orderingFields[0]}`,
      }),
    );
  }

  // ── Pagination query params ───────────────────────
  const defaultSize = config.pageSize || 20;
  const maxSize = config.maxPageSize || 100;

  decorators.push(
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (1-based)',
      example: 1,
    }),
    ApiQuery({
      name: 'page_size',
      required: false,
      type: Number,
      description: `Items per page (default: ${defaultSize}, max: ${maxSize})`,
      example: defaultSize,
    }),
  );

  return decorators;
}

// ── Helper: extract config from input ─────────────────────

function extractConfig(input: ApiFiltersInput): ApiFiltersConfig {
  if (typeof input === 'function') {
    const instance = new (input as new () => FilterSet)();
    return {
      filterFields: instance.filterFields,
      searchFields: instance.searchFields,
      orderingFields: instance.orderingFields,
      defaultOrdering: instance.defaultOrdering,
      pageSize: instance.pageSize,
      maxPageSize: instance.maxPageSize,
    };
  }
  return input;
}

// ── @ApiFilters() ─────────────────────────────────────────

/**
 * Method or class decorator that:
 * 1. Stores the filter configuration as metadata for {@link Filtered} to use.
 * 2. Generates `@ApiQuery()` Swagger decorators for every declared filter
 *    field + lookup, `search`, `ordering`, `page`, and `page_size` — so they
 *    all appear in Swagger UI automatically.
 *
 * Works together with {@link Filtered} to automatically parse query
 * parameters into a `QueryOptions` object.
 *
 * Can be applied at **method level** (recommended — Swagger docs attach to the
 * route) or **class level** (runtime filtering works, but Swagger docs only
 * display when combined with per-method `@Filtered()`).
 */
export function ApiFilters(input: ApiFiltersInput) {
  const config = extractConfig(input);
  const swaggerDecorators = buildSwaggerDecorators(config);

  return applyDecorators(
    SetMetadata(API_FILTERS_METADATA, input),
    ...swaggerDecorators,
  );
}

// ── Helper: resolve input → FilterSet instance ────────────

function resolveFilterSet(input: ApiFiltersInput): FilterSet {
  if (typeof input === 'function') {
    return new (input as new () => FilterSet)();
  }

  const fs = new FilterSet();
  const config = input as ApiFiltersConfig;

  Object.assign(fs, {
    ...(config.filterFields && { filterFields: config.filterFields }),
    ...(config.searchFields && { searchFields: config.searchFields }),
    ...(config.orderingFields && { orderingFields: config.orderingFields }),
    ...(config.defaultOrdering && { defaultOrdering: config.defaultOrdering }),
    ...(config.pageSize !== undefined && { pageSize: config.pageSize }),
    ...(config.maxPageSize !== undefined && {
      maxPageSize: config.maxPageSize,
    }),
  });

  return fs;
}

// ── @Filtered() ───────────────────────────────────────────

/**
 * Parameter decorator that resolves the {@link FilterSet} from
 * `@ApiFilters()` metadata, parses the current request's query
 * parameters, and injects a ready-to-use `QueryOptions`.
 *
 * If no `@ApiFilters()` metadata is found on the handler or class,
 * returns an empty `QueryOptions` (no filtering applied).
 *
 * @example
 * ```typescript
 * @Get()
 * @ApiFilters({
 *   filterFields: { status: ['exact', 'in'], price: ['gte', 'lte'] },
 *   searchFields: ['name'],
 *   orderingFields: ['name', 'createdAt'],
 * })
 * findAll(@Filtered() query: QueryOptions) {
 *   // query.filter  — FilterOptions[]
 *   // query.search  — SearchOptions | undefined
 *   // query.sort    — SortOptions[] | undefined
 *   // query.page    — number
 *   // query.limit   — number
 *   return this.repo.findMany(query);
 * }
 * ```
 */
export const Filtered = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): QueryOptions => {
    const request = ctx.switchToHttp().getRequest<Request>();

    // Look for metadata on the handler first, then on the class
    const input: ApiFiltersInput | undefined =
      Reflect.getMetadata(API_FILTERS_METADATA, ctx.getHandler()) ??
      Reflect.getMetadata(API_FILTERS_METADATA, ctx.getClass());

    if (!input) {
      return { page: 1, limit: 20 };
    }

    const filterSet = resolveFilterSet(input);
    return filterSet.applyToQuery(
      request.query as Record<string, string | string[] | undefined>,
    );
  },
);

/**
 * Alias matching DRF naming.
 * @deprecated Prefer {@link Filtered}.
 */
export const DRFFiltered = Filtered;
