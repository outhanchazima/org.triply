import { randomBytes, randomInt } from 'crypto';

/**
 * Generate an M-PESA-style transaction reference with an encoded date prefix
 * followed by cryptographically random alphanumeric characters.
 *
 * **Format:** `[YearChar][MonthChar][DayChar][random]`
 *
 * - **Year:** `M` = 2026, `N` = 2027, … `Z` = 2039, `A` = 2040, … `L` = 2051 (wraps after 26 years).
 * - **Month:** `A` = January, `B` = February, … `L` = December.
 * - **Day:** `1`–`9` for days 1–9; `A` = 10, `B` = 11, … `V` = 31.
 * - **Random suffix:** drawn from `A-Z` (no I/O) and `2-9` (no 0/1).
 *
 * The first 3 characters encode the current date, so the total random
 * portion is `length - 3` characters.
 *
 * @param length - Total length of the reference (default `10`). Must be ≥ 4.
 * @returns An uppercase alphanumeric string, e.g. `"AB5D4NFLF2"`.
 *
 * @example
 * ```ts
 * // On 2026-02-25:
 * generateTransactionRef();     // "MBP7H2XBRT"  (M=2026, B=Feb, P=25)
 * generateTransactionRef(13);   // "MBP7H2XBRT4NK"
 * ```
 */
export function generateTransactionRef(length = 10): string {
  // M-PESA-style transaction reference generator
  // Format: [Year][Month][Day][7-random-chars]
  // Example: "AJ21D4NFLF" where A=2026, J2=month, 1=day, D4NFLF=random

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate(); // 1-31

  // Year mapping: M=2026, N=2027, ..., Z=2039, A=2040, ..., L=2051
  const yearChar = String.fromCharCode(65 + ((year - 2026 + 12) % 26));

  // Month mapping: A=1, B=2, ..., L=12
  const monthChar = String.fromCharCode(64 + month);

  // Day: use single digit (1-9) or letter (A=10, B=11, ..., V=31)
  const dayChar = day <= 9 ? String(day) : String.fromCharCode(55 + day); // A=10, B=11, etc.

  // Remaining characters: random alphanumeric (no I/O/0/1 for clarity)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomLength = length - 3;
  const bytes = randomBytes(randomLength);
  let randomPart = '';
  for (let i = 0; i < randomLength; i++) {
    randomPart += chars[bytes[i] % chars.length];
  }

  return yearChar + monthChar + dayChar + randomPart;
}

/**
 * Generate a prefixed order ID using an M-PESA-style reference.
 *
 * The date is already encoded inside the transaction ref, so no
 * separate `YYYYMMDD` segment is needed.
 *
 * Format: `{prefix}-{10-char ref}`
 *
 * @param prefix - The identifier prefix (default `"ORD"`).
 * @returns A unique order ID, e.g. `"ORD-MBP7H2XBRT"`.
 *
 * @example
 * ```ts
 * generateOrderId();        // "ORD-MBP7H2XBRT"
 * generateOrderId('TKT');   // "TKT-MBPN4P8XRW"
 * ```
 */
export function generateOrderId(prefix = 'ORD'): string {
  return `${prefix}-${generateTransactionRef(10)}`;
}

/**
 * Generate a short airline-style booking reference (PNR).
 *
 * Uses a 9-character M-PESA-style ref (3 date chars + 6 random) to
 * balance brevity with collision resistance.
 *
 * Format: `{prefix}-{9-char ref}`
 *
 * @param prefix - The identifier prefix (default `"PNR"`).
 * @returns A booking reference, e.g. `"PNR-MBPD4NFLF"`.
 *
 * @example
 * ```ts
 * generateBookingRef();        // "PNR-MBPD4NFLF"
 * generateBookingRef('BKG');   // "BKG-MBPN4P8XR"
 * ```
 */
export function generateBookingRef(prefix = 'PNR'): string {
  return `${prefix}-${generateTransactionRef(9)}`;
}

/**
 * Generate a cryptographically secure numeric one-time password (OTP).
 *
 * @param length - Number of digits (default `6`).
 * @returns A zero-padded numeric string, e.g. `"482917"`.
 *
 * @example
 * ```ts
 * generateOTP();   // "482917"
 * generateOTP(4);  // "7291"
 * ```
 */
export function generateOTP(length = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(randomInt(min, max + 1));
}

/**
 * Generate a short, URL-safe, case-sensitive unique identifier.
 *
 * Uses `A-Z`, `a-z`, and `0-9` (62 characters).
 *
 * @param length - Desired length (default `8`).
 * @returns A mixed-case alphanumeric string, e.g. `"a3Bf9xZ2"`.
 *
 * @example
 * ```ts
 * generateShortId();    // "a3Bf9xZ2"
 * generateShortId(12);  // "kR4nWx9Lp2Yq"
 * ```
 */
export function generateShortId(length = 8): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Generate a UUID v4 using the built-in Web Crypto API.
 *
 * @returns A standard UUID v4 string, e.g. `"550e8400-e29b-41d4-a716-446655440000"`.
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate a sortable, prefixed ID with a Unix-second timestamp component.
 *
 * IDs generated later will sort lexicographically after earlier ones
 * (within the same prefix).
 *
 * Format: `{prefix}_{unix_seconds}_{random}`
 *
 * @param prefix       - A short namespace prefix (e.g. `"usr"`, `"txn"`).
 * @param randomLength - Length of the random suffix (default `6`).
 * @returns A sortable prefixed ID, e.g. `"usr_1740500000_a3Bf9x"`.
 *
 * @example
 * ```ts
 * generatePrefixedId('usr');      // "usr_1740500000_a3Bf9x"
 * generatePrefixedId('txn', 8);   // "txn_1740500000_kR4nWx9L"
 * ```
 */
export function generatePrefixedId(prefix: string, randomLength = 6): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const random = generateShortId(randomLength);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate a sequential invoice number with year and zero-padded sequence.
 *
 * Format: `{prefix}-{YYYY}-{00000}`
 *
 * @param sequence - The current invoice sequence counter.
 * @param prefix   - The identifier prefix (default `"INV"`).
 * @returns An invoice number, e.g. `"INV-2026-00042"`.
 *
 * @example
 * ```ts
 * generateInvoiceNumber(42);          // "INV-2026-00042"
 * generateInvoiceNumber(1, 'RCP');     // "RCP-2026-00001"
 * ```
 */
export function generateInvoiceNumber(
  sequence: number,
  prefix = 'INV',
): string {
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(5, '0');
  return `${prefix}-${year}-${seq}`;
}

/**
 * Validate that a string matches the {@link generateTransactionRef} format.
 *
 * Checks:
 * 1. Length matches `expectedLength`.
 * 2. First char is `A-Z` (year).
 * 3. Second char is `A-L` (month).
 * 4. Third char is `1-9` or `A-V` (day).
 * 5. Remaining chars are from the ambiguity-free set (`A-Z` without I/O, `2-9`).
 *
 * @param ref            - The reference string to validate.
 * @param expectedLength - Expected character count (default `10`).
 * @returns `true` if the reference is valid.
 *
 * @example
 * ```ts
 * isValidTransactionRef('MBP7H2XBRT');     // true
 * isValidTransactionRef('MBP7H2XBR');       // false (9 chars)
 * isValidTransactionRef('ZLP7H2XBRT', 10); // true
 * ```
 */
export function isValidTransactionRef(
  ref: string,
  expectedLength = 10,
): boolean {
  if (ref.length !== expectedLength) return false;

  // Year: A-Z
  if (!/^[A-Z]/.test(ref[0])) return false;
  // Month: A-L (Jan-Dec)
  if (!/^[A-L]$/.test(ref[1])) return false;
  // Day: 1-9 or A-V (10-31)
  if (!/^[1-9A-V]$/.test(ref[2])) return false;
  // Random suffix: ambiguity-free set
  const suffix = ref.slice(3);
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]+$/.test(suffix);
}

/**
 * Compute a single check digit for a numeric string using the
 * [Luhn algorithm](https://en.wikipedia.org/wiki/Luhn_algorithm).
 *
 * Useful for generating card numbers, account numbers, and other
 * identifiers that need basic integrity checking.
 *
 * @param numericStr - A string of digits (without the check digit).
 * @returns The computed check digit (`0`–9).
 *
 * @example
 * ```ts
 * luhnCheckDigit('7992739871');  // 3
 * ```
 */
export function luhnCheckDigit(numericStr: string): number {
  const digits = numericStr.split('').map(Number).reverse();
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits[i];
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Validate a numeric string whose **last digit** is a Luhn check digit.
 *
 * @param numericStr - The full numeric string including the check digit.
 * @returns `true` if the check digit is correct.
 *
 * @example
 * ```ts
 * isValidLuhn('79927398713');  // true
 * isValidLuhn('79927398710');  // false
 * ```
 */
export function isValidLuhn(numericStr: string): boolean {
  const body = numericStr.slice(0, -1);
  const check = parseInt(numericStr.slice(-1), 10);
  return luhnCheckDigit(body) === check;
}
