/**
 * Metadata block included in every API response envelope.
 */
export interface ApiResponseMeta {
  /** ISO 8601 timestamp of when the response was generated. */
  timestamp: string;
  /** The request URL path, e.g. `"/v1/flights"`. */
  path: string;
  /** Correlation / request ID (set by {@link CorrelationIdMiddleware}). */
  requestId?: string;
}

/**
 * Standardised envelope for **successful** API responses.
 *
 * @typeParam T - The type of the response payload.
 */
export interface ApiSuccessResponse<T = unknown> {
  /** Always `true` for successful responses. */
  success: true;
  /** The response payload. */
  data: T;
  /** Response metadata. */
  meta: ApiResponseMeta;
}

/**
 * Standardised envelope for **error** API responses.
 */
export interface ApiErrorResponse {
  /** Always `false` for error responses. */
  success: false;
  /** Error details. */
  error: {
    /** HTTP status code (e.g. `400`, `404`, `500`). */
    code: number;
    /** Human-readable error message. */
    message: string;
    /** Optional validation errors or stack trace (non-production only). */
    details?: unknown;
  };
  /** Response metadata. */
  meta: ApiResponseMeta;
}

/**
 * Pagination metadata returned alongside paginated result sets.
 */
export interface PaginationMeta {
  /** Current 1-based page number. */
  page: number;
  /** Maximum items per page. */
  limit: number;
  /** Total number of items across all pages. */
  total: number;
  /** Total number of pages (`Math.ceil(total / limit)`). */
  totalPages: number;
  /** `true` if there is a next page. */
  hasNext: boolean;
  /** `true` if there is a previous page. */
  hasPrevious: boolean;
}

/**
 * Standardised envelope for **paginated** API responses.
 *
 * @typeParam T - The type of each item in the result set.
 */
export interface PaginatedResponse<T = unknown> {
  /** Always `true` for successful responses. */
  success: true;
  /** The current page of results. */
  data: T[];
  /** Pagination metadata. */
  pagination: PaginationMeta;
  /** Response metadata. */
  meta: ApiResponseMeta;
}
