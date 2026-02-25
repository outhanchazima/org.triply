/**
 * Deep clone an object using the native `structuredClone` API.
 *
 * Handles nested objects, arrays, `Date`, `Map`, `Set`, `RegExp`, etc.
 * Does **not** clone functions or DOM nodes.
 *
 * @typeParam T - The type of the object to clone.
 * @param obj - The object to clone.
 * @returns A deep copy of `obj`.
 *
 * @example
 * ```ts
 * const copy = deepClone({ a: { b: 1 } });
 * ```
 */
export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

/**
 * Create a new object containing only the specified keys.
 *
 * @typeParam T - The source object type.
 * @typeParam K - The keys to pick.
 * @param obj  - The source object.
 * @param keys - Array of keys to include.
 * @returns A new object with only the picked keys.
 *
 * @example
 * ```ts
 * pick({ a: 1, b: 2, c: 3 }, ['a', 'c']);  // { a: 1, c: 3 }
 * ```
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/**
 * Create a new object with the specified keys removed.
 *
 * @typeParam T - The source object type.
 * @typeParam K - The keys to omit.
 * @param obj  - The source object.
 * @param keys - Array of keys to exclude.
 * @returns A shallow copy of `obj` without the omitted keys.
 *
 * @example
 * ```ts
 * omit({ a: 1, b: 2, c: 3 }, ['b']);  // { a: 1, c: 3 }
 * ```
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/**
 * Remove keys whose values are `undefined` or `null`.
 *
 * @typeParam T - The source object type.
 * @param obj - The source object.
 * @returns A new object containing only non-nullish entries.
 *
 * @example
 * ```ts
 * compact({ a: 1, b: null, c: undefined, d: 0 });
 * // { a: 1, d: 0 }
 * ```
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/**
 * Flatten a nested object into a single-level object with dot-notation keys.
 *
 * Arrays and `Date` instances are treated as leaf values and are **not**
 * recursed into.
 *
 * @param obj    - The nested object to flatten.
 * @param prefix - Internal prefix for recursive calls (default `""`).
 * @returns A flat `Record` with dot-delimited keys.
 *
 * @example
 * ```ts
 * flatten({ a: { b: { c: 1 } }, d: 2 });
 * // { 'a.b.c': 1, d: 2 }
 * ```
 */
export function flatten(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      Object.assign(result, flatten(value as Record<string, unknown>, path));
    } else {
      result[path] = value;
    }
  }

  return result;
}

/**
 * Retrieve a deeply nested value using a dot-notation path.
 *
 * Returns `undefined` if any intermediate key is missing.
 *
 * @param obj  - The source object.
 * @param path - Dot-delimited path, e.g. `"user.address.city"`.
 * @returns The value at the path, or `undefined`.
 *
 * @example
 * ```ts
 * getNestedValue({ user: { name: 'Alice' } }, 'user.name');  // "Alice"
 * getNestedValue({ user: {} }, 'user.address.city');          // undefined
 * ```
 */
export function getNestedValue(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Set a deeply nested value using a dot-notation path.
 *
 * Intermediate objects are created automatically if they do not exist.
 *
 * @param obj   - The target object (mutated in place).
 * @param path  - Dot-delimited path, e.g. `"user.address.city"`.
 * @param value - The value to set.
 *
 * @example
 * ```ts
 * const obj: Record<string, unknown> = {};
 * setNestedValue(obj, 'user.address.city', 'Lilongwe');
 * // obj → { user: { address: { city: 'Lilongwe' } } }
 * ```
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * Recursively merge `source` into `target`.
 *
 * - Nested plain objects are merged recursively.
 * - Arrays and non-plain values in `source` **overwrite** the target.
 * - Returns a **new** object; neither `target` nor `source` is mutated.
 *
 * @typeParam T - The object type.
 * @param target - The base object.
 * @param source - Partial overrides.
 * @returns A new deeply merged object.
 *
 * @example
 * ```ts
 * deepMerge({ a: { b: 1, c: 2 } }, { a: { c: 3 } });
 * // { a: { b: 1, c: 3 } }
 * ```
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const output = { ...target };

  for (const [key, sourceVal] of Object.entries(source)) {
    const targetVal = (target as Record<string, unknown>)[key];

    if (
      targetVal &&
      sourceVal &&
      typeof targetVal === 'object' &&
      typeof sourceVal === 'object' &&
      !Array.isArray(targetVal) &&
      !Array.isArray(sourceVal)
    ) {
      (output as Record<string, unknown>)[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else {
      (output as Record<string, unknown>)[key] = sourceVal;
    }
  }

  return output;
}

/**
 * Group an array of objects by the value of a given key.
 *
 * @typeParam T - The item type.
 * @param items - The array to group.
 * @param key   - The property to group by.
 * @returns A record mapping each group key to its items.
 *
 * @example
 * ```ts
 * groupBy([{ type: 'A', v: 1 }, { type: 'B', v: 2 }, { type: 'A', v: 3 }], 'type');
 * // { A: [{ type: 'A', v: 1 }, { type: 'A', v: 3 }], B: [{ type: 'B', v: 2 }] }
 * ```
 */
export function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce(
    (acc, item) => {
      const group = String(item[key]);
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}

/**
 * Create a lookup map (dictionary) from an array, keyed by a property.
 *
 * If multiple items share the same key value, the **last** one wins.
 *
 * @typeParam T - The item type.
 * @param items - The array to index.
 * @param key   - The property whose value becomes the map key.
 * @returns A record mapping each key value to its item.
 *
 * @example
 * ```ts
 * keyBy([{ id: 'a', name: 'Alice' }, { id: 'b', name: 'Bob' }], 'id');
 * // { a: { id: 'a', name: 'Alice' }, b: { id: 'b', name: 'Bob' } }
 * ```
 */
export function keyBy<T>(items: T[], key: keyof T): Record<string, T> {
  return items.reduce(
    (acc, item) => {
      acc[String(item[key])] = item;
      return acc;
    },
    {} as Record<string, T>,
  );
}
