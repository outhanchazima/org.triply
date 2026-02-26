/**
 * @module array.util
 *
 * Array manipulation helpers that complement native Array methods.
 * All functions are **pure** — they never mutate the input array.
 */

/**
 * Remove duplicate values from an array.
 *
 * For primitive arrays this uses strict equality; for object arrays
 * provide a `keyFn` to extract the identity value.
 *
 * @typeParam T - Element type.
 * @param arr   - Source array.
 * @param keyFn - Optional function returning a unique key per element.
 * @returns A new array with duplicates removed.
 *
 * @example
 * ```ts
 * unique([1, 2, 2, 3]);                       // [1, 2, 3]
 * unique(users, (u) => u.id);                  // unique by id
 * ```
 */
export function unique<T>(arr: T[], keyFn?: (item: T) => unknown): T[] {
  if (!keyFn) return [...new Set(arr)];

  const seen = new Set<unknown>();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Split an array into chunks of a given size.
 *
 * @typeParam T   - Element type.
 * @param arr     - Source array.
 * @param size    - Maximum chunk size (must be ≥ 1).
 * @returns An array of arrays, each containing at most `size` elements.
 *
 * @example
 * ```ts
 * chunk([1, 2, 3, 4, 5], 2);  // [[1, 2], [3, 4], [5]]
 * ```
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size < 1) throw new Error('Chunk size must be at least 1');
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Flatten a nested array one level deep.
 *
 * @typeParam T - Inner element type.
 * @param arr   - Array of arrays.
 * @returns A single-level array.
 *
 * @example
 * ```ts
 * flattenArray([[1, 2], [3], [4, 5]]);  // [1, 2, 3, 4, 5]
 * ```
 */
export function flattenArray<T>(arr: T[][]): T[] {
  return arr.reduce<T[]>((acc, val) => acc.concat(val), []);
}

/**
 * Compute the intersection of two arrays (elements present in both).
 *
 * @typeParam T - Element type.
 * @param a - First array.
 * @param b - Second array.
 * @returns Elements found in both `a` and `b`.
 *
 * @example
 * ```ts
 * intersection([1, 2, 3], [2, 3, 4]);  // [2, 3]
 * ```
 */
export function intersection<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b);
  return unique(a.filter((item) => setB.has(item)));
}

/**
 * Compute the difference of two arrays (elements in `a` but not in `b`).
 *
 * @typeParam T - Element type.
 * @param a - First array.
 * @param b - Second array.
 * @returns Elements found in `a` but not in `b`.
 *
 * @example
 * ```ts
 * difference([1, 2, 3], [2, 3, 4]);  // [1]
 * ```
 */
export function difference<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b);
  return a.filter((item) => !setB.has(item));
}

/**
 * Sort an array of objects by one or more keys.
 *
 * @typeParam T   - Element type.
 * @param arr     - Source array.
 * @param keys    - Sort descriptors: field name and optional order.
 * @returns A new sorted array.
 *
 * @example
 * ```ts
 * sortBy(users, [
 *   { key: 'lastName', order: 'asc' },
 *   { key: 'firstName', order: 'asc' },
 * ]);
 * ```
 */
export function sortBy<T extends Record<string, unknown>>(
  arr: T[],
  keys: Array<{ key: keyof T & string; order?: 'asc' | 'desc' }>,
): T[] {
  return [...arr].sort((a, b) => {
    for (const { key, order = 'asc' } of keys) {
      const valA = a[key];
      const valB = b[key];
      if (valA === valB) continue;
      if (valA == null) return order === 'asc' ? -1 : 1;
      if (valB == null) return order === 'asc' ? 1 : -1;
      const cmp = valA < valB ? -1 : 1;
      return order === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

/**
 * Partition an array into two groups based on a predicate.
 *
 * @typeParam T    - Element type.
 * @param arr      - Source array.
 * @param predicate - Function returning `true` for the first group.
 * @returns A tuple `[pass, fail]`.
 *
 * @example
 * ```ts
 * const [evens, odds] = partition([1, 2, 3, 4], (n) => n % 2 === 0);
 * // evens = [2, 4], odds = [1, 3]
 * ```
 */
export function partition<T>(
  arr: T[],
  predicate: (item: T, index: number) => boolean,
): [T[], T[]] {
  const pass: T[] = [];
  const fail: T[] = [];
  arr.forEach((item, i) => {
    (predicate(item, i) ? pass : fail).push(item);
  });
  return [pass, fail];
}

/**
 * Get the first element matching a predicate, or `undefined`.
 *
 * Unlike `Array.find`, this returns both the element **and** its index.
 *
 * @typeParam T    - Element type.
 * @param arr      - Source array.
 * @param predicate - Test function.
 * @returns `{ item, index }` or `undefined` if no match.
 */
export function findWithIndex<T>(
  arr: T[],
  predicate: (item: T, index: number) => boolean,
): { item: T; index: number } | undefined {
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i], i)) {
      return { item: arr[i], index: i };
    }
  }
  return undefined;
}

/**
 * Shuffle an array using the Fisher-Yates algorithm.
 *
 * **Not** cryptographically secure.
 *
 * @typeParam T - Element type.
 * @param arr   - Source array.
 * @returns A new shuffled array.
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Take the first N elements from an array.
 *
 * @typeParam T - Element type.
 * @param arr   - Source array.
 * @param n     - Number of elements to take.
 * @returns A new array with at most `n` elements.
 */
export function take<T>(arr: T[], n: number): T[] {
  return arr.slice(0, Math.max(0, n));
}

/**
 * Take the last N elements from an array.
 *
 * @typeParam T - Element type.
 * @param arr   - Source array.
 * @param n     - Number of elements to take from the end.
 * @returns A new array with at most `n` elements.
 */
export function takeLast<T>(arr: T[], n: number): T[] {
  if (n <= 0) return [];
  return arr.slice(-n);
}

/**
 * Create an object mapping from an array using key and value extractors.
 *
 * @typeParam T - Element type.
 * @typeParam V - Value type in the resulting map.
 * @param arr    - Source array.
 * @param keyFn  - Function to extract the key.
 * @param valFn  - Function to extract the value (defaults to identity).
 * @returns A plain object mapping keys to values.
 *
 * @example
 * ```ts
 * toMap(users, (u) => u.id, (u) => u.name);
 * // { '1': 'Alice', '2': 'Bob' }
 * ```
 */
export function toMap<T, V = T>(
  arr: T[],
  keyFn: (item: T) => string | number,
  valFn?: (item: T) => V,
): Record<string, V> {
  return arr.reduce<Record<string, V>>((acc, item) => {
    const key = String(keyFn(item));
    acc[key] = valFn ? valFn(item) : (item as unknown as V);
    return acc;
  }, {});
}

/**
 * Count occurrences of each value returned by `keyFn`.
 *
 * @typeParam T - Element type.
 * @param arr   - Source array.
 * @param keyFn - Function to extract the grouping key.
 * @returns An object mapping keys to their occurrence count.
 *
 * @example
 * ```ts
 * countBy(orders, (o) => o.status);
 * // { pending: 5, completed: 12, cancelled: 2 }
 * ```
 */
export function countBy<T>(
  arr: T[],
  keyFn: (item: T) => string | number,
): Record<string, number> {
  return arr.reduce<Record<string, number>>((acc, item) => {
    const key = String(keyFn(item));
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Zip two arrays together into an array of tuples.
 *
 * The result length equals the shorter input array.
 *
 * @typeParam A - Type of elements in the first array.
 * @typeParam B - Type of elements in the second array.
 * @param a - First array.
 * @param b - Second array.
 * @returns Array of `[A, B]` tuples.
 *
 * @example
 * ```ts
 * zip(['a', 'b', 'c'], [1, 2, 3]);  // [['a', 1], ['b', 2], ['c', 3]]
 * ```
 */
export function zip<A, B>(a: A[], b: B[]): [A, B][] {
  const length = Math.min(a.length, b.length);
  const result: [A, B][] = [];
  for (let i = 0; i < length; i++) {
    result.push([a[i], b[i]]);
  }
  return result;
}

/**
 * Check if an array is empty or nullish.
 *
 * @param arr - The array to check.
 * @returns `true` if the array is null, undefined, or has zero length.
 */
export function isEmpty<T>(arr: T[] | null | undefined): boolean {
  return !arr || arr.length === 0;
}

/**
 * Return a random element from an array, or `undefined` if empty.
 *
 * @typeParam T - Element type.
 * @param arr   - Source array.
 * @returns A random element or `undefined`.
 */
export function sample<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Return N random elements from an array (without replacement).
 *
 * @typeParam T - Element type.
 * @param arr   - Source array.
 * @param n     - Number of samples to take.
 * @returns A new array of at most `n` random elements.
 */
export function sampleN<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

/**
 * Get the minimum element by a numeric extractor.
 *
 * @typeParam T - Element type.
 * @param arr   - Source array.
 * @param fn    - Function to extract the numeric comparison value.
 * @returns The element with the smallest value, or `undefined` if empty.
 */
export function minBy<T>(arr: T[], fn: (item: T) => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr.reduce((min, item) => (fn(item) < fn(min) ? item : min));
}

/**
 * Get the maximum element by a numeric extractor.
 *
 * @typeParam T - Element type.
 * @param arr   - Source array.
 * @param fn    - Function to extract the numeric comparison value.
 * @returns The element with the largest value, or `undefined` if empty.
 */
export function maxBy<T>(arr: T[], fn: (item: T) => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr.reduce((max, item) => (fn(item) > fn(max) ? item : max));
}
