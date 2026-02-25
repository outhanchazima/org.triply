import { Logger } from '@nestjs/common';

/**
 * Configuration options for the {@link retry} utility.
 */
export interface RetryOptions {
  /**
   * Maximum number of attempts (including the first).
   * @defaultValue 3
   */
  maxAttempts?: number;
  /**
   * Base delay between retries in milliseconds.
   * When `backoff` is enabled this value is doubled on each subsequent attempt.
   * @defaultValue 1000
   */
  delayMs?: number;
  /**
   * Whether to apply exponential back-off (`delay × 2^(attempt-1)`).
   * @defaultValue true
   */
  backoff?: boolean;
  /**
   * Optional callback invoked after each failed attempt.
   * If omitted, a warning is logged via the NestJS Logger.
   *
   * @param attempt - The 1-based attempt number that just failed.
   * @param error   - The error thrown by the function.
   */
  onRetry?: (attempt: number, error: Error) => void;
}

const logger = new Logger('RetryUtil');

/**
 * Retry an async function up to `maxAttempts` times with optional
 * exponential back-off.
 *
 * On each failure the delay is calculated as:
 * - **backoff = true** (default): `delayMs × 2^(attempt - 1)`
 * - **backoff = false**: constant `delayMs`
 *
 * If all attempts fail, the **last** error is re-thrown.
 *
 * @typeParam T - Return type of the function being retried.
 * @param fn      - The async function to execute.
 * @param options - Optional {@link RetryOptions}.
 * @returns The resolved value of `fn`.
 * @throws The last error if all attempts are exhausted.
 *
 * @example
 * ```ts
 * const data = await retry(() => fetchFromApi('/flights'), {
 *   maxAttempts: 5,
 *   delayMs: 500,
 *   backoff: true,
 * });
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, backoff = true, onRetry } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) break;

      const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;

      if (onRetry) {
        onRetry(attempt, lastError);
      } else {
        logger.warn(
          `Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms...`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
