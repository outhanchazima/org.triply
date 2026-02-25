/**
 * Capitalize the first letter of a string, leaving the rest unchanged.
 *
 * @param str - The input string.
 * @returns The string with its first character upper-cased.
 *
 * @example
 * ```ts
 * capitalize('hello');  // "Hello"
 * capitalize('');       // ""
 * ```
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Title-case every word in a string.
 *
 * @param str - The input string.
 * @returns Each space-delimited word with its first letter capitalized.
 *
 * @example
 * ```ts
 * titleCase('hello world');  // "Hello World"
 * ```
 */
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Convert a string to `camelCase`.
 *
 * Handles spaces, hyphens, and underscores as word separators.
 *
 * @param str - The input string.
 * @returns The camelCased result.
 *
 * @example
 * ```ts
 * camelCase('flight-search');   // "flightSearch"
 * camelCase('some_value');      // "someValue"
 * ```
 */
export function camelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, char: string | undefined) =>
      char ? char.toUpperCase() : '',
    )
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

/**
 * Convert a string to `snake_case`.
 *
 * @param str - The input string.
 * @returns The snake_cased result.
 *
 * @example
 * ```ts
 * snakeCase('flightSearch');  // "flight_search"
 * snakeCase('Hello World');   // "hello_world"
 * ```
 */
export function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

/**
 * Convert a string to `kebab-case`.
 *
 * @param str - The input string.
 * @returns The kebab-cased result.
 *
 * @example
 * ```ts
 * kebabCase('flightSearch');  // "flight-search"
 * kebabCase('Hello World');   // "hello-world"
 * ```
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

/**
 * Truncate a string to a maximum length, appending an ellipsis suffix.
 *
 * If the string is already within `maxLength`, it is returned as-is.
 *
 * @param str       - The input string.
 * @param maxLength - Maximum allowed length **including** the suffix.
 * @param suffix    - The truncation indicator (default `"..."`).
 * @returns The (possibly truncated) string.
 *
 * @example
 * ```ts
 * truncate('Lilongwe to Nairobi via Addis Ababa', 20);
 * // "Lilongwe to Nairo..."
 * ```
 */
export function truncate(
  str: string,
  maxLength: number,
  suffix = '...',
): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Mask a string, revealing only the last `visibleChars` characters.
 *
 * @param str          - The input string.
 * @param visibleChars - Number of trailing characters to leave visible (default `4`).
 * @param maskChar     - The masking character (default `"*"`).
 * @returns The masked string.
 *
 * @example
 * ```ts
 * mask('4111111111111111');  // "************1111"
 * ```
 */
export function mask(str: string, visibleChars = 4, maskChar = '*'): string {
  if (str.length <= visibleChars) return str;
  return maskChar.repeat(str.length - visibleChars) + str.slice(-visibleChars);
}

/**
 * Mask an email address, showing only the first character of the local part.
 *
 * @param email - A valid email address.
 * @returns The masked email, e.g. `"u***@gmail.com"`.
 *
 * @example
 * ```ts
 * maskEmail('user@gmail.com');  // "u***@gmail.com"
 * ```
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const masked = local.charAt(0) + '***';
  return `${masked}@${domain}`;
}

/**
 * Mask a phone number, showing only the last 4 digits.
 *
 * Non-digit characters are stripped before masking.
 *
 * @param phone - The phone number string.
 * @returns The masked phone number.
 *
 * @example
 * ```ts
 * maskPhone('+265 999 123 456');  // "*********3456"
 * ```
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return phone;
  return '*'.repeat(digits.length - 4) + digits.slice(-4);
}

/**
 * Remove **all** whitespace characters from a string.
 *
 * @param str - The input string.
 * @returns The string with every whitespace character removed.
 *
 * @example
 * ```ts
 * stripWhitespace('  he llo  ');  // "hello"
 * ```
 */
export function stripWhitespace(str: string): string {
  return str.replace(/\s+/g, '');
}

/**
 * Collapse runs of whitespace into a single space and trim edges.
 *
 * @param str - The input string.
 * @returns The normalized string.
 *
 * @example
 * ```ts
 * normalizeWhitespace('  hello   world  ');  // "hello world"
 * ```
 */
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Basic email format validation.
 *
 * This is a **lightweight** check (not RFC 5322 compliant). Use a
 * dedicated validation library or `class-validator` for strict validation.
 *
 * @param str - The string to test.
 * @returns `true` if the string looks like an email address.
 */
export function isEmail(str: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

/**
 * Check whether a string is a valid URL by attempting to parse it
 * with the built-in `URL` constructor.
 *
 * @param str - The string to test.
 * @returns `true` if the string is parseable as a URL.
 */
export function isUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract uppercase initials from a full name.
 *
 * @param name     - A space-delimited name.
 * @param maxChars - Maximum number of initials to return (default `2`).
 * @returns The initials, e.g. `"JD"` for `"John Doe"`.
 *
 * @example
 * ```ts
 * initials('John Doe');              // "JD"
 * initials('Alice Bob Charlie', 3);  // "ABC"
 * ```
 */
export function initials(name: string, maxChars = 2): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, maxChars)
    .join('');
}

/**
 * Naively pluralize a word based on a count.
 *
 * Appends `"s"` by default, or uses a custom plural form.
 *
 * @param word   - The singular form.
 * @param count  - The item count.
 * @param plural - Optional explicit plural form.
 * @returns The singular or plural form.
 *
 * @example
 * ```ts
 * pluralize('flight', 1);                // "flight"
 * pluralize('flight', 3);                // "flights"
 * pluralize('person', 5, 'people');      // "people"
 * ```
 */
export function pluralize(
  word: string,
  count: number,
  plural?: string,
): string {
  if (count === 1) return word;
  return plural ?? `${word}s`;
}

/**
 * Left-pad a string or number to a minimum length.
 *
 * @param value  - The value to pad.
 * @param length - The desired minimum length.
 * @param char   - The padding character (default `"0"`).
 * @returns The padded string.
 *
 * @example
 * ```ts
 * padStart(42, 5);        // "00042"
 * padStart('A', 3, '_');  // "__A"
 * ```
 */
export function padStart(
  value: string | number,
  length: number,
  char = '0',
): string {
  return String(value).padStart(length, char);
}
