import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosError, AxiosRequestConfig, AxiosRequestHeaders } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import { Agent } from 'https';
import qs from 'qs';
import { catchError, lastValueFrom } from 'rxjs';

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

/**
 * Injectable HTTP client that wraps `@nestjs/axios` with:
 *
 * - Automatic **content-type negotiation** (JSON, form-urlencoded, multipart).
 * - **Bearer-token injection** from an optional `token` parameter.
 * - **Per-request timing** logged via the NestJS {@link Logger}.
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
  // Public API
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
    return this.execute<R>('GET', url, {
      token,
      headers,
      contentType: RequestContentType.JSON,
    });
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
      { token, headers, contentType: RequestContentType.JSON },
    );
    if (data) return data;
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
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    options: {
      payload?: Record<string, unknown>;
      contentType?: RequestContentType;
      token?: string;
      headers?: AxiosRequestHeaders;
    } = {},
  ): Promise<{ status: number; data: R }> {
    const { payload, token, headers: extraHeaders } = options;
    const contentType = options.contentType ?? RequestContentType.JSON;

    const requestHeaders: Record<string, string> = {
      'Content-Type': contentType,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(extraHeaders as Record<string, string>),
    };

    const body = payload ? this.prepareBody(payload, contentType) : undefined;

    const config: AxiosRequestConfig = {
      headers: requestHeaders,
      httpsAgent: this.httpsAgent,
      timeout: DEFAULT_TIMEOUT_MS,
    };

    const startTime = Date.now();

    try {
      const { status, data } = await lastValueFrom(
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

      this.logTiming(method, url, status, startTime);
      return { status, data };
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
