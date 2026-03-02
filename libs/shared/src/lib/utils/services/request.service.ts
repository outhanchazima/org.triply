import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  AxiosError,
  AxiosRequestConfig,
  AxiosRequestHeaders,
  AxiosResponseHeaders,
  RawAxiosResponseHeaders,
} from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import { Agent } from 'https';
import qs from 'qs';
import { catchError, lastValueFrom } from 'rxjs';

import { retry, RetryOptions } from '../../utils/retry.util';

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Supported content types for outbound HTTP requests.
 *
 * @example
 * ```ts
 * service.postRequest(url, body, RequestContentType.FORM_DATA);
 * ```
 */
export enum RequestContentType {
  FORM_URLENCODED = 'application/x-www-form-urlencoded',
  FORM_DATA = 'multipart/form-data',
  JSON = 'application/json',
}

/** Supported HTTP methods. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

/**
 * Options bag for the generic {@link RequestService.request} method.
 *
 * Every field is optional — sensible defaults are applied for all of them.
 *
 * @example
 * ```ts
 * const { data } = await http.request<SearchResult>({
 *   method: 'GET',
 *   url: 'https://api.example.com/flights',
 *   params: { origin: 'LLW', dest: 'JNB' },
 *   token: accessToken,
 *   timeout: 30_000,
 * });
 * ```
 */
export interface RequestOptions {
  /** HTTP method (default `GET`). */
  method?: HttpMethod;
  /** Target URL. */
  url: string;
  /** Request body — only used for POST / PUT / PATCH. */
  payload?: Record<string, unknown>;
  /** Query-string parameters appended to the URL. */
  params?: Record<string, string | number | boolean | undefined>;
  /** Content-type for the body (default {@link RequestContentType.JSON}). */
  contentType?: RequestContentType | string;
  /** Bearer token injected as `Authorization` header. */
  token?: string;
  /** Additional headers merged on top of the defaults. */
  headers?: AxiosRequestHeaders;
  /** Per-request timeout in ms (default `60 000`). */
  timeout?: number;
  /**
   * Axios `responseType` override.
   * Use `'arraybuffer'` or `'stream'` for binary downloads.
   */
  responseType?: AxiosRequestConfig['responseType'];
}

/**
 * Full response envelope returned by {@link RequestService.requestFull}.
 *
 * Includes response headers in addition to the status and body so callers
 * can inspect `content-type`, pagination headers, rate-limit headers, etc.
 */
export interface FullResponse<R> {
  status: number;
  data: R;
  headers: RawAxiosResponseHeaders | AxiosResponseHeaders;
}

/**
 * Injectable HTTP client that wraps `@nestjs/axios` with:
 *
 * - Automatic **content-type negotiation** (JSON, form-urlencoded, multipart).
 * - **Bearer-token injection** from an optional `token` parameter.
 * - **Query-string serialisation** via the `params` option.
 * - **Per-request timing** logged via the NestJS {@link Logger}.
 * - **Retry with back-off** via {@link RequestService.requestWithRetry}.
 * - **Health-check ping** via {@link RequestService.isAlive}.
 * - **Binary downloads** via {@link RequestService.downloadRequest}.
 * - Unified **error handling** — upstream errors are re-thrown as
 *   {@link HttpException} with the original status code.
 *
 * > **Note:** SSL verification is disabled for all requests by default.
 * > This is acceptable for internal / development traffic but should be
 * > revisited for public-facing calls.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class PaymentsService {
 *   constructor(private readonly http: RequestService) {}
 *
 *   charge(amount: number) {
 *     return this.http.postRequest<{ amount: number }, ChargeResult>(
 *       'https://payments.example.com/charge',
 *       { amount },
 *     );
 *   }
 * }
 * ```
 */
@Injectable()
export class RequestService {
  private readonly logger = new Logger(RequestService.name);
  private readonly httpsAgent = new Agent({ rejectUnauthorized: false });

  constructor(private readonly httpService: HttpService) {}

  // ---------------------------------------------------------------------------
  // Legacy convenience methods (signatures preserved for backward compat)
  // ---------------------------------------------------------------------------

  /**
   * Perform an HTTP **GET** request.
   *
   * @typeParam R - Expected response-body type.
   * @param url     - Target URL.
   * @param token   - Optional Bearer token.
   * @param headers - Extra headers merged on top of the defaults.
   * @returns The HTTP status code and parsed response body.
   */
  async getRequest<R>(
    url: string,
    token?: string,
    headers?: AxiosRequestHeaders,
  ): Promise<{ status: number; data: R }> {
    return this.execute<R>('GET', url, { token, headers });
  }

  /**
   * Perform an HTTP **POST** request.
   *
   * @typeParam P - Payload type (must extend `Record<string, unknown>`).
   * @typeParam R - Expected response-body type.
   * @param url         - Target URL.
   * @param payload     - Request body.
   * @param contentType - Body encoding (default {@link RequestContentType.JSON}).
   * @param token       - Optional Bearer token.
   * @param headers     - Extra headers merged on top of the defaults.
   * @returns The HTTP status code and parsed response body.
   */
  async postRequest<P extends Record<string, unknown>, R>(
    url: string,
    payload: P,
    contentType: string = RequestContentType.JSON,
    token?: string,
    headers?: AxiosRequestHeaders,
  ): Promise<{ status: number; data: R }> {
    return this.execute<R>('POST', url, {
      payload,
      contentType: this.resolveContentType(contentType),
      token,
      headers,
    });
  }

  /**
   * Perform an HTTP **PUT** request.
   *
   * @typeParam P - Payload type.
   * @typeParam R - Expected response-body type.
   * @param url         - Target URL.
   * @param payload     - Request body.
   * @param contentType - Body encoding (default {@link RequestContentType.JSON}).
   * @param token       - Optional Bearer token.
   * @param headers     - Extra headers merged on top of the defaults.
   * @returns The HTTP status code and parsed response body.
   */
  async putRequest<P extends Record<string, unknown>, R>(
    url: string,
    payload: P,
    contentType: string = RequestContentType.JSON,
    token?: string,
    headers?: AxiosRequestHeaders,
  ): Promise<{ status: number; data: R }> {
    return this.execute<R>('PUT', url, {
      payload,
      contentType: this.resolveContentType(contentType),
      token,
      headers,
    });
  }

  /**
   * Perform an HTTP **PATCH** request.
   *
   * @typeParam P - Payload type.
   * @typeParam R - Expected response-body type.
   * @param url         - Target URL.
   * @param payload     - Request body.
   * @param contentType - Body encoding (default {@link RequestContentType.JSON}).
   * @param token       - Optional Bearer token.
   * @param headers     - Extra headers merged on top of the defaults.
   * @returns The HTTP status code and parsed response body.
   */
  async patchRequest<P extends Record<string, unknown>, R>(
    url: string,
    payload: P,
    contentType: string = RequestContentType.JSON,
    token?: string,
    headers?: AxiosRequestHeaders,
  ): Promise<{ status: number; data: R }> {
    return this.execute<R>('PATCH', url, {
      payload,
      contentType: this.resolveContentType(contentType),
      token,
      headers,
    });
  }

  /**
   * Perform an HTTP **DELETE** request.
   *
   * @typeParam R - Expected response-body type.
   * @param url     - Target URL.
   * @param token   - Optional Bearer token.
   * @param headers - Extra headers merged on top of the defaults.
   * @returns The parsed response body, or `void` if the server returns no content.
   */
  async deleteRequest<R>(
    url: string,
    token?: string,
    headers?: AxiosRequestHeaders,
  ): Promise<{ data: R } | void> {
    const { data } = await this.execute<{ data: R } | undefined>(
      'DELETE',
      url,
      { token, headers },
    );
    if (data) return data;
  }

  // ---------------------------------------------------------------------------
  // Advanced public API
  // ---------------------------------------------------------------------------

  /**
   * Generic request method using a single {@link RequestOptions} bag.
   *
   * Prefer this over the legacy positional-param helpers when you need
   * query params, custom timeouts, or non-standard response types.
   *
   * @typeParam R - Expected response-body type.
   * @param options - Full request options.
   * @returns The HTTP status code and parsed response body.
   *
   * @example
   * ```ts
   * const { data } = await http.request<FlightOffer[]>({
   *   url: 'https://api.amadeus.com/v2/shopping/flight-offers',
   *   params: { originLocationCode: 'LLW', destinationLocationCode: 'JNB' },
   *   token: amadeusToken,
   *   timeout: 30_000,
   * });
   * ```
   */
  async request<R>(
    options: RequestOptions,
  ): Promise<{ status: number; data: R }> {
    const method = options.method ?? 'GET';
    const url = this.buildUrl(options.url, options.params);
    return this.execute<R>(method, url, {
      payload: options.payload,
      contentType: options.contentType
        ? this.resolveContentType(options.contentType)
        : undefined,
      token: options.token,
      headers: options.headers,
      timeout: options.timeout,
      responseType: options.responseType,
    });
  }

  /**
   * Like {@link request} but returns the full Axios response including
   * response **headers**. Useful when you need pagination cursors,
   * `x-ratelimit-*` headers, or `content-disposition` for downloads.
   *
   * @typeParam R - Expected response-body type.
   * @param options - Full request options.
   * @returns Status, body, and response headers.
   *
   * @example
   * ```ts
   * const { headers, data } = await http.requestFull<Booking[]>({
   *   url: '/api/bookings',
   *   params: { page: '2' },
   * });
   * const totalPages = headers['x-total-pages'];
   * ```
   */
  async requestFull<R>(options: RequestOptions): Promise<FullResponse<R>> {
    const method = options.method ?? 'GET';
    const url = this.buildUrl(options.url, options.params);
    return this.executeFull<R>(method, url, {
      payload: options.payload,
      contentType: options.contentType
        ? this.resolveContentType(options.contentType)
        : undefined,
      token: options.token,
      headers: options.headers,
      timeout: options.timeout,
      responseType: options.responseType,
    });
  }

  /**
   * Perform a **GET** request with typed query parameters.
   *
   * Convenience wrapper that serialises `params` into a query string
   * (handles arrays, nested objects via `qs`).
   *
   * @typeParam R - Expected response-body type.
   * @param url     - Base URL (query string is appended).
   * @param params  - Key-value pairs for the query string.
   * @param token   - Optional Bearer token.
   * @param headers - Extra headers.
   * @returns The HTTP status code and parsed response body.
   *
   * @example
   * ```ts
   * const { data } = await http.getWithParams<FlightOffer[]>(
   *   'https://api.example.com/flights',
   *   { origin: 'LLW', dest: 'JNB', date: '2026-03-15' },
   *   token,
   * );
   * ```
   */
  async getWithParams<R>(
    url: string,
    params: Record<string, string | number | boolean | undefined>,
    token?: string,
    headers?: AxiosRequestHeaders,
  ): Promise<{ status: number; data: R }> {
    return this.execute<R>('GET', this.buildUrl(url, params), {
      token,
      headers,
    });
  }

  /**
   * Perform an HTTP **HEAD** request.
   *
   * Returns only the status code and response headers — no body is
   * transferred. Useful for checking resource existence, content length,
   * or cache-validation headers without downloading the full response.
   *
   * @param url     - Target URL.
   * @param token   - Optional Bearer token.
   * @param headers - Extra headers.
   * @returns Status code and response headers.
   *
   * @example
   * ```ts
   * const { status, headers } = await http.headRequest(
   *   'https://cdn.example.com/tickets/abc.pdf',
   * );
   * const size = Number(headers['content-length']);
   * ```
   */
  async headRequest(
    url: string,
    token?: string,
    headers?: AxiosRequestHeaders,
  ): Promise<{
    status: number;
    headers: RawAxiosResponseHeaders | AxiosResponseHeaders;
  }> {
    const { status, headers: resHeaders } = await this.executeFull<unknown>(
      'HEAD',
      url,
      { token, headers },
    );
    return { status, headers: resHeaders };
  }

  /**
   * Execute a request with **automatic retry and exponential back-off**,
   * powered by the shared {@link retry} utility.
   *
   * Ideal for unreliable third-party APIs (payment gateways, airline GDS,
   * SMS providers) where transient failures are expected.
   *
   * @typeParam R - Expected response-body type.
   * @param options      - Full request options.
   * @param retryOptions - Retry configuration (max attempts, delay, back-off).
   * @returns The HTTP status code and parsed response body.
   *
   * @example
   * ```ts
   * const { data } = await http.requestWithRetry<PaymentResult>(
   *   {
   *     method: 'POST',
   *     url: 'https://payments.example.com/charge',
   *     payload: { amount: 5000, currency: 'MWK' },
   *     token: paymentToken,
   *   },
   *   { maxAttempts: 3, delayMs: 1000, backoff: true },
   * );
   * ```
   */
  async requestWithRetry<R>(
    options: RequestOptions,
    retryOptions: RetryOptions = {},
  ): Promise<{ status: number; data: R }> {
    return retry(() => this.request<R>(options), retryOptions);
  }

  /**
   * Quick health-check: sends a **HEAD** (or **GET** fallback) request and
   * returns `true` if the server responds with any 2xx status.
   *
   * Useful for startup readiness checks or circuit-breaker probes.
   *
   * @param url     - The endpoint to check.
   * @param timeout - Per-request timeout in ms (default `5000`).
   * @returns `true` if the service is reachable and returns 2xx.
   *
   * @example
   * ```ts
   * if (await http.isAlive('https://api.amadeus.com/v1/security/oauth2/token')) {
   *   // Amadeus API is reachable
   * }
   * ```
   */
  async isAlive(url: string, timeout = 5_000): Promise<boolean> {
    try {
      const { status } = await this.execute<unknown>('HEAD', url, {
        timeout,
      });
      return status >= 200 && status < 300;
    } catch {
      return false;
    }
  }

  /**
   * Download binary data (PDF, image, CSV, etc.) as a `Buffer`.
   *
   * Sets `responseType: 'arraybuffer'` so Axios returns raw bytes
   * instead of attempting JSON parse.
   *
   * @param url     - Target URL.
   * @param token   - Optional Bearer token.
   * @param headers - Extra headers.
   * @param timeout - Per-request timeout in ms (default `60 000`).
   * @returns The HTTP status, raw `Buffer`, and response headers
   *          (check `content-type` and `content-disposition`).
   *
   * @example
   * ```ts
   * const { data, headers } = await http.downloadRequest(
   *   'https://api.example.com/tickets/abc.pdf',
   *   token,
   * );
   * fs.writeFileSync('/tmp/ticket.pdf', Buffer.from(data));
   * ```
   */
  async downloadRequest(
    url: string,
    token?: string,
    headers?: AxiosRequestHeaders,
    timeout?: number,
  ): Promise<FullResponse<ArrayBuffer>> {
    return this.executeFull<ArrayBuffer>('GET', url, {
      token,
      headers,
      timeout,
      responseType: 'arraybuffer',
    });
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /**
   * Centralised request executor. All public methods delegate here to avoid
   * duplicating header construction, error handling, and timing logic.
   *
   * @param method  - HTTP verb.
   * @param url     - Target URL.
   * @param options - Per-request options (payload, content type, auth, headers).
   * @returns The HTTP status and parsed response body.
   * @private
   */
  private async execute<R>(
    method: HttpMethod,
    url: string,
    options: ExecuteOptions = {},
  ): Promise<{ status: number; data: R }> {
    const { status, data } = await this.executeFull<R>(method, url, options);
    return { status, data };
  }

  /**
   * Like {@link execute} but also returns response headers.
   *
   * @private
   */
  private async executeFull<R>(
    method: HttpMethod,
    url: string,
    options: ExecuteOptions = {},
  ): Promise<FullResponse<R>> {
    const { payload, token, headers: extraHeaders } = options;
    const contentType = options.contentType ?? RequestContentType.JSON;
    const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;

    const requestHeaders: Record<string, string> = {
      'Content-Type': contentType,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(extraHeaders as Record<string, string>),
    };

    const body = payload ? this.prepareBody(payload, contentType) : undefined;

    const config: AxiosRequestConfig = {
      headers: requestHeaders,
      httpsAgent: this.httpsAgent,
      timeout,
      ...(options.responseType ? { responseType: options.responseType } : {}),
    };

    const startTime = Date.now();

    try {
      const response = await lastValueFrom(
        this.observe<R>(method, url, body, config).pipe(
          catchError((error: AxiosError) => {
            this.logTiming(method, url, error.response?.status, startTime);
            throw new HttpException(
              error.response?.data
                ? (error.response.data as string | Record<string, unknown>)
                : 'An error occurred while making the request',
              error.response?.status || HttpStatus.BAD_REQUEST,
            );
          }),
        ),
      );

      this.logTiming(method, url, response.status, startTime);
      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'An unexpected error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Return the appropriate `HttpService` observable for the given HTTP method.
   *
   * @param method - HTTP verb.
   * @param url    - Target URL.
   * @param body   - Prepared request body (if applicable).
   * @param config - Axios request config.
   * @returns An observable wrapping the Axios response.
   * @private
   */
  private observe<R>(
    method: string,
    url: string,
    body: unknown,
    config: AxiosRequestConfig,
  ) {
    switch (method) {
      case 'GET':
        return this.httpService.get<R>(url, config);
      case 'HEAD':
        return this.httpService.head<R>(url, config);
      case 'DELETE':
        return this.httpService.delete<R>(url, config);
      case 'POST':
        return this.httpService.post<R>(url, body, config);
      case 'PUT':
        return this.httpService.put<R>(url, body, config);
      case 'PATCH':
        return this.httpService.patch<R>(url, body, config);
      default:
        return this.httpService.get<R>(url, config);
    }
  }

  /**
   * Encode a payload object according to the requested content type.
   *
   * - **JSON** — returned as-is (Axios serialises it).
   * - **form-urlencoded** — encoded via `qs.stringify`.
   * - **multipart/form-data** — each field appended to a {@link FormData}
   *   instance; values with a `path` property are streamed as files.
   *
   * @param payload     - Key/value data to encode.
   * @param contentType - Target encoding.
   * @returns The encoded body.
   * @private
   */
  private prepareBody(
    payload: Record<string, unknown>,
    contentType: RequestContentType,
  ): string | FormData | Record<string, unknown> {
    switch (contentType) {
      case RequestContentType.FORM_URLENCODED:
        return qs.stringify(payload);

      case RequestContentType.FORM_DATA: {
        const form = new FormData();
        for (const [key, value] of Object.entries(payload)) {
          if (value && typeof value === 'object' && 'path' in value) {
            form.append(
              key,
              fs.createReadStream((value as { path: string }).path),
            );
          } else {
            form.append(key, String(value));
          }
        }
        return form;
      }

      case RequestContentType.JSON:
      default:
        return payload;
    }
  }

  /**
   * Resolve a raw content-type string to a {@link RequestContentType} enum
   * value. Throws {@link HttpException} if the value is not recognised.
   *
   * @param raw - The content-type string to resolve.
   * @returns The matching enum member.
   * @private
   */
  private resolveContentType(raw: string): RequestContentType {
    const values = Object.values(RequestContentType) as string[];
    if (values.includes(raw)) return raw as RequestContentType;
    throw new HttpException(
      `Invalid request content type: ${raw}`,
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * Append query-string parameters to a URL.
   *
   * Strips `undefined` values so callers can pass optional params without
   * filtering them first. Arrays and nested objects are serialised via `qs`.
   *
   * @param baseUrl - The base URL (may already contain a query string).
   * @param params  - Key-value pairs to serialise.
   * @returns The URL with the query string appended.
   * @private
   */
  private buildUrl(
    baseUrl: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    if (!params) return baseUrl;

    const cleaned: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) cleaned[key] = value;
    }

    if (Object.keys(cleaned).length === 0) return baseUrl;

    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${qs.stringify(cleaned)}`;
  }

  /**
   * Log the duration of an HTTP request using the NestJS {@link Logger}.
   *
   * @param method    - HTTP verb.
   * @param url       - Target URL.
   * @param status    - Response status code (may be undefined on network errors).
   * @param startTime - `Date.now()` timestamp captured before the request.
   * @private
   */
  private logTiming(
    method: string,
    url: string,
    status: number | undefined,
    startTime: number,
  ): void {
    const duration = ((Date.now() - startTime) / 1000).toFixed(3);
    this.logger.log(`${method} ${url} — ${status ?? 'UNKNOWN'} (${duration}s)`);
  }
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** @internal Options passed to the private execute / executeFull methods. */
interface ExecuteOptions {
  payload?: Record<string, unknown>;
  contentType?: RequestContentType;
  token?: string;
  headers?: AxiosRequestHeaders;
  timeout?: number;
  responseType?: AxiosRequestConfig['responseType'];
}
