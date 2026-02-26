/**
 * @module async.util
 *
 * Lightweight async helpers that complement {@link retry} and other
 * concurrency patterns used across the application.
 */

/**
 * Pause execution for the given number of milliseconds.
 *
 * @param ms - Duration to sleep in milliseconds.
 * @returns A promise that resolves after `ms` milliseconds.
 *
 * @example
 * ```ts
 * await sleep(1000); // wait 1 second
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run an async function with a timeout.
 *
 * If `fn` does not resolve within `ms` milliseconds, the returned
 * promise rejects with a `TimeoutError`.
 *
 * @typeParam T - Return type of the async function.
 * @param fn  - The async function to execute.
 * @param ms  - Maximum allowed execution time in milliseconds.
 * @returns The resolved value of `fn`.
 * @throws {Error} If the timeout elapses before `fn` resolves.
 *
 * @example
 * ```ts
 * const data = await withTimeout(() => fetchData(), 5000);
 * ```
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  ms: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Operation timed out after ${ms}ms`)),
      ms,
    );
  });

  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Execute an array of async functions with a concurrency limit.
 *
 * Unlike `Promise.all`, this ensures that at most `concurrency` tasks
 * run simultaneously — useful for rate-limited APIs or I/O-heavy work.
 *
 * @typeParam T       - Return type of each task.
 * @param tasks       - Array of zero-argument async functions.
 * @param concurrency - Maximum number of tasks running at once (default `5`).
 * @returns An array of results in the same order as `tasks`.
 *
 * @example
 * ```ts
 * const urls = ['https://a.com', 'https://b.com', 'https://c.com'];
 * const results = await parallelLimit(
 *   urls.map((url) => () => fetch(url).then((r) => r.json())),
 *   2,
 * );
 * ```
 */
export async function parallelLimit<T>(
  tasks: Array<() => Promise<T>>,
  concurrency = 5,
): Promise<T[]> {
  const results: T[] = Array.from({ length: tasks.length }) as T[];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const current = index++;
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker(),
  );

  await Promise.all(workers);
  return results;
}
