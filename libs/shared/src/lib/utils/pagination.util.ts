import {
  PaginatedResponse,
  PaginationMeta,
} from '../interfaces/api-response.interface';

/**
 * Build pagination metadata from the current page, page size, and total count.
 *
 * @param page  - Current 1-based page number.
 * @param limit - Maximum items per page.
 * @param total - Total number of items across all pages.
 * @returns A {@link PaginationMeta} object with computed `totalPages`,
 *   `hasNext`, and `hasPrevious` flags.
 *
 * @example
 * ```ts
 * buildPaginationMeta(2, 20, 95);
 * // { page: 2, limit: 20, total: 95, totalPages: 5, hasNext: true, hasPrevious: true }
 * ```
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

/**
 * Build a complete {@link PaginatedResponse} envelope ready to be returned
 * from a controller.
 *
 * @typeParam T      - Type of each item in the result set.
 * @param data       - The page of results.
 * @param page       - Current 1-based page number.
 * @param limit      - Maximum items per page.
 * @param total      - Total items across all pages.
 * @param path       - The request URL path (used in `meta`).
 * @param requestId  - Optional correlation / request ID.
 * @returns A fully formed {@link PaginatedResponse} object.
 *
 * @example
 * ```ts
 * return paginatedResponse(flights, query.page, query.limit, total, req.url);
 * ```
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  path: string,
  requestId?: string,
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination: buildPaginationMeta(page, limit, total),
    meta: {
      timestamp: new Date().toISOString(),
      path,
      requestId,
    },
  };
}
