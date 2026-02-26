/**
 * @module sanitize.util
 *
 * Utilities for sanitizing user-supplied strings to prevent XSS,
 * injection, and other input-based attacks.
 *
 * All functions are **pure** — they never mutate the input.
 */

/**
 * Strip all HTML tags from a string.
 *
 * @param str - The raw input string.
 * @returns The string with every `<…>` tag removed.
 *
 * @example
 * ```ts
 * stripHtml('<p>Hello <b>World</b></p>');  // "Hello World"
 * ```
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Escape HTML special characters so the string can be safely embedded
 * in an HTML document without being interpreted as markup.
 *
 * Escapes: `&`, `<`, `>`, `"`, `'`, `` ` ``.
 *
 * @param str - The raw input string.
 * @returns The HTML-escaped string.
 *
 * @example
 * ```ts
 * escapeHtml('<script>alert("xss")</script>');
 * // "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
 * ```
 */
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;',
  };
  return str.replace(/[&<>"'`]/g, (char) => map[char]);
}

/**
 * Remove characters that are commonly used in SQL injection attempts.
 *
 * This is a **defence-in-depth** measure — always prefer parameterised
 * queries over string sanitisation for SQL safety.
 *
 * @param str - The raw input string.
 * @returns The sanitised string with dangerous characters removed.
 *
 * @example
 * ```ts
 * stripSqlChars("'; DROP TABLE users; --");  // " DROP TABLE users "
 * ```
 */
export function stripSqlChars(str: string): string {
  return str.replace(/['";\\-]{2,}|['";\\]/g, '');
}

/**
 * Remove all non-alphanumeric characters except a given whitelist.
 *
 * @param str       - The raw input string.
 * @param allowList - Characters to keep in addition to `[a-zA-Z0-9]`
 *   (default `' -_@.'`).
 * @returns The sanitised string.
 *
 * @example
 * ```ts
 * stripSpecialChars('user@example.com!#$');  // "user@example.com"
 * stripSpecialChars('abc<>xyz', '');          // "abcxyz"
 * ```
 */
export function stripSpecialChars(str: string, allowList = ' -_@.'): string {
  const escaped = allowList.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`[^a-zA-Z0-9${escaped}]`, 'g');
  return str.replace(regex, '');
}

/**
 * Sanitise a string for safe use as a file name.
 *
 * Strips path separators, null bytes, and other characters that are
 * invalid or dangerous on common file systems.
 *
 * @param name - The raw file name.
 * @returns A safe file name string.
 *
 * @example
 * ```ts
 * sanitizeFileName('../etc/passwd');       // "etcpasswd"
 * sanitizeFileName('my file (1).txt');     // "my file (1).txt"
 * ```
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/\0/g, '') // null bytes
    .replace(/[/\\:*?"<>|]/g, '') // invalid FS chars
    .replace(/^\.+/, '') // leading dots (hidden files / path traversal)
    .trim();
}

/**
 * Sanitise a string by applying multiple common sanitisation steps:
 * 1. Strip HTML tags.
 * 2. Collapse whitespace and trim edges.
 * 3. Limit length to `maxLength`.
 *
 * Suitable as a quick one-liner for user-facing text fields.
 *
 * @param str       - The raw input string.
 * @param maxLength - Maximum allowed length (default `1000`).
 * @returns The sanitised string.
 *
 * @example
 * ```ts
 * sanitize('  <b>Hello</b>   World  ');  // "Hello World"
 * ```
 */
export function sanitize(str: string, maxLength = 1000): string {
  return stripHtml(str).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
