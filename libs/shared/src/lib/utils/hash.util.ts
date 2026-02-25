import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Compute the SHA-256 hash of a string and return it as a lowercase hex digest.
 *
 * @param data - The input string to hash.
 * @returns 64-character lowercase hex string.
 *
 * @example
 * ```ts
 * sha256('hello'); // "2cf24dba5fb0a30e26e83b2ac5b9e29e..."
 * ```
 */
export function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a cryptographically secure random hex token.
 *
 * @param bytes - Number of random bytes (default `32`, producing 64 hex chars).
 * @returns A hex-encoded random string.
 *
 * @example
 * ```ts
 * generateToken();    // 64-char hex string
 * generateToken(16);  // 32-char hex string
 * ```
 */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 *
 * Returns `false` immediately if the strings differ in length (this is
 * acceptable because length is not secret information in most use cases).
 *
 * @param a - First string (e.g. the expected token).
 * @param b - Second string (e.g. the user-supplied token).
 * @returns `true` if both strings are identical.
 *
 * @example
 * ```ts
 * safeCompare(storedHash, userProvidedHash);
 * ```
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
