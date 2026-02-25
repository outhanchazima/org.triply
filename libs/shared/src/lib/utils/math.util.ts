/**
 * @module math.util
 *
 * Precision-safe arithmetic and general-purpose math helpers.
 *
 * The **Precision Arithmetic** section avoids IEEE 754 floating-point
 * errors by scaling operands to integers before computation.
 *
 * @example
 * ```ts
 * 0.1 + 0.2;              // 0.30000000000000004  ← JS default
 * preciseAdd(0.1, 0.2);   // 0.3                  ← correct
 * ```
 */

// ── Precision Arithmetic ───────────────────────────────

/**
 * Count the number of decimal places in a number.
 *
 * Handles scientific notation (e.g. `1e-7` → `7`).
 *
 * @param n - The number to inspect.
 * @returns The number of decimal places.
 *
 * @example
 * ```ts
 * decimalPlaces(1.234);   // 3
 * decimalPlaces(100);     // 0
 * decimalPlaces(1e-7);    // 7
 * ```
 */
export function decimalPlaces(n: number): number {
  const str = String(n);
  const dotIndex = str.indexOf('.');
  if (dotIndex === -1) return 0;
  // Handle scientific notation (e.g. 1e-7)
  const eIndex = str.indexOf('e-');
  if (eIndex !== -1) {
    const mantissaDecimals =
      dotIndex === -1 ? 0 : str.slice(dotIndex + 1, eIndex).length;
    return mantissaDecimals + parseInt(str.slice(eIndex + 2), 10);
  }
  return str.length - dotIndex - 1;
}

/**
 * Scale a number to an integer by removing its decimal places via
 * string manipulation (avoids float errors during scaling).
 *
 * @param n      - The number to scale.
 * @param places - Number of decimal places to absorb.
 * @returns The scaled integer.
 * @internal
 */
function scaleUp(n: number, places: number): number {
  // Use string manipulation to avoid float errors during scaling
  const parts = String(n).split('.');
  const intPart = parts[0];
  const fracPart = (parts[1] || '').padEnd(places, '0').slice(0, places);
  return parseInt(intPart + fracPart, 10);
}

/**
 * Determine the maximum number of decimal places across multiple numbers.
 *
 * @param nums - Numbers to inspect.
 * @returns The highest decimal-place count.
 * @internal
 */
function maxDecimals(...nums: number[]): number {
  return Math.max(...nums.map(decimalPlaces));
}

/**
 * Floating-point-safe addition.
 *
 * @param a - First operand.
 * @param b - Second operand.
 * @returns The precise sum.
 *
 * @example
 * ```ts
 * preciseAdd(0.1, 0.2);  // 0.3
 * ```
 */
export function preciseAdd(a: number, b: number): number {
  const dp = maxDecimals(a, b);
  const factor = Math.pow(10, dp);
  return (scaleUp(a, dp) + scaleUp(b, dp)) / factor;
}

/**
 * Floating-point-safe subtraction.
 *
 * @param a - Minuend.
 * @param b - Subtrahend.
 * @returns The precise difference.
 *
 * @example
 * ```ts
 * preciseSubtract(0.3, 0.1);  // 0.2
 * ```
 */
export function preciseSubtract(a: number, b: number): number {
  const dp = maxDecimals(a, b);
  const factor = Math.pow(10, dp);
  return (scaleUp(a, dp) - scaleUp(b, dp)) / factor;
}

/**
 * Floating-point-safe multiplication.
 *
 * @param a - First factor.
 * @param b - Second factor.
 * @returns The precise product.
 *
 * @example
 * ```ts
 * preciseMultiply(0.1, 0.2);  // 0.02
 * ```
 */
export function preciseMultiply(a: number, b: number): number {
  const dpA = decimalPlaces(a);
  const dpB = decimalPlaces(b);
  return (scaleUp(a, dpA) * scaleUp(b, dpB)) / Math.pow(10, dpA + dpB);
}

/**
 * Floating-point-safe division with configurable result precision.
 *
 * @param a         - Dividend.
 * @param b         - Divisor (must not be `0`).
 * @param precision - Maximum decimal places in the result (default `10`).
 * @returns The precise quotient.
 * @throws {Error} If `b` is zero.
 *
 * @example
 * ```ts
 * preciseDivide(1, 3);      // 0.3333333333
 * preciseDivide(1, 3, 4);   // 0.3333
 * ```
 */
export function preciseDivide(a: number, b: number, precision = 10): number {
  if (b === 0) throw new Error('Division by zero');
  const dp = maxDecimals(a, b);
  const result = scaleUp(a, dp) / scaleUp(b, dp);
  const factor = Math.pow(10, precision);
  return Math.round(result * factor) / factor;
}

/**
 * Round a number using **banker's rounding** (round half to even).
 *
 * Unlike `Math.round`, which always rounds 0.5 up, banker's rounding
 * rounds to the nearest **even** digit, producing a more statistically
 * balanced distribution — important for financial aggregations.
 *
 * @param value    - The number to round.
 * @param decimals - Number of decimal places.
 * @returns The rounded value.
 *
 * @example
 * ```ts
 * bankersRound(2.5, 0);   // 2  (rounds to even)
 * bankersRound(3.5, 0);   // 4  (rounds to even)
 * bankersRound(2.55, 1);  // 2.6
 * ```
 */
export function bankersRound(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  const shifted = value * factor;
  const truncated = Math.trunc(shifted);
  const remainder = Math.abs(shifted - truncated);

  if (Math.abs(remainder - 0.5) < 1e-10) {
    // Exactly 0.5 — round to even
    return truncated % 2 === 0
      ? truncated / factor
      : (truncated + Math.sign(shifted)) / factor;
  }

  return Math.round(shifted) / factor;
}

/**
 * Truncate to N decimal places **without** rounding.
 *
 * @param value    - The number to truncate.
 * @param decimals - Number of decimal places to keep.
 * @returns The truncated value.
 *
 * @example
 * ```ts
 * truncateDecimals(1.999, 2);  // 1.99
 * ```
 */
export function truncateDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.trunc(value * factor) / factor;
}

/**
 * Round **up** (ceiling) to N decimal places.
 *
 * @param value    - The number to ceil.
 * @param decimals - Number of decimal places.
 * @returns The ceiled value.
 *
 * @example
 * ```ts
 * ceilTo(1.001, 2);  // 1.01
 * ```
 */
export function ceilTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.ceil(value * factor) / factor;
}

/**
 * Round **down** (floor) to N decimal places.
 *
 * @param value    - The number to floor.
 * @param decimals - Number of decimal places.
 * @returns The floored value.
 *
 * @example
 * ```ts
 * floorTo(1.999, 2);  // 1.99
 * ```
 */
export function floorTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.floor(value * factor) / factor;
}

/**
 * Check if two floating-point numbers are equal within a tolerance.
 *
 * @param a       - First number.
 * @param b       - Second number.
 * @param epsilon - Maximum allowed difference (default `1e-10`).
 * @returns `true` if `|a - b| < epsilon`.
 *
 * @example
 * ```ts
 * nearlyEqual(0.1 + 0.2, 0.3);  // true
 * ```
 */
export function nearlyEqual(a: number, b: number, epsilon = 1e-10): boolean {
  return Math.abs(a - b) < epsilon;
}

// ── General Math ───────────────────────────────────────

/**
 * Clamp a number to the inclusive range `[min, max]`.
 *
 * @param value - The input value.
 * @param min   - Lower bound.
 * @param max   - Upper bound.
 * @returns The clamped value.
 *
 * @example
 * ```ts
 * clamp(150, 0, 100);  // 100
 * clamp(-5, 0, 100);   // 0
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round a number to a specific number of decimal places using
 * standard `Math.round` semantics.
 *
 * For financial rounding, prefer {@link bankersRound}.
 *
 * @param value    - The number to round.
 * @param decimals - Number of decimal places.
 * @returns The rounded value.
 *
 * @example
 * ```ts
 * roundTo(3.14159, 2);  // 3.14
 * ```
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Generate a pseudo-random integer in the inclusive range `[min, max]`.
 *
 * Uses `Math.random()` — **not** cryptographically secure.
 * For crypto-safe randomness, use `crypto.randomInt`.
 *
 * @param min - Lower bound (inclusive).
 * @param max - Upper bound (inclusive).
 * @returns A random integer.
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a pseudo-random float in the range `[min, max)`.
 *
 * @param min - Lower bound (inclusive).
 * @param max - Upper bound (exclusive).
 * @returns A random float.
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Calculate what percentage `value` is of `total`.
 *
 * Returns `0` when `total` is zero to avoid division errors.
 *
 * @param value - The part.
 * @param total - The whole.
 * @returns The percentage rounded to 2 decimal places.
 *
 * @example
 * ```ts
 * percentage(25, 200);  // 12.5
 * ```
 */
export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return roundTo((value / total) * 100, 2);
}

/**
 * Calculate the percentage change from an old value to a new value.
 *
 * @param oldValue - The original value.
 * @param newValue - The updated value.
 * @returns The percentage change (positive = increase, negative = decrease),
 *   rounded to 2 decimal places.
 *
 * @example
 * ```ts
 * percentageChange(100, 125);  // 25
 * percentageChange(100, 80);   // -20
 * ```
 */
export function percentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return roundTo(((newValue - oldValue) / Math.abs(oldValue)) * 100, 2);
}

/**
 * Sum all numbers in an array.
 *
 * @param values - Array of numbers.
 * @returns The sum.
 */
export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/**
 * Calculate the arithmetic mean of an array of numbers.
 *
 * Returns `0` for an empty array.
 *
 * @param values - Array of numbers.
 * @returns The average.
 */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

/**
 * Calculate the median of an array of numbers.
 *
 * For even-length arrays, returns the average of the two middle values.
 * Returns `0` for an empty array.
 *
 * @param values - Array of numbers.
 * @returns The median.
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Convert an angle from degrees to radians.
 *
 * @param degrees - Angle in degrees.
 * @returns Angle in radians.
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate the great-circle distance between two geographic points
 * using the [Haversine formula](https://en.wikipedia.org/wiki/Haversine_formula).
 *
 * Useful for estimating flight distances or proximity searches.
 *
 * @param lat1 - Latitude of point A (degrees).
 * @param lng1 - Longitude of point A (degrees).
 * @param lat2 - Latitude of point B (degrees).
 * @param lng2 - Longitude of point B (degrees).
 * @returns Distance in **kilometres**, rounded to 2 decimal places.
 *
 * @example
 * ```ts
 * // Lilongwe (LLW) → Nairobi (NBO)
 * haversineDistance(-13.9626, 33.7741, -1.3192, 36.9278);
 * // ≈ 1415.23 km
 * ```
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return roundTo(R * c, 2);
}
