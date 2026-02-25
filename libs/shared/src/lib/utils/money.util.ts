/**
 * @module money.util
 *
 * All monetary calculations use **integer minor units** (cents, tambala, etc.)
 * to avoid floating-point precision issues.
 *
 * For currency conversion the module uses **BigInt-scaled exchange rates**
 * (×10^12) so that even rates with many decimal places (e.g. `0.000579203`)
 * are preserved without any floating-point loss.
 */

/**
 * Represents a monetary value in its smallest indivisible unit.
 *
 * @example
 * ```ts
 * // $12.50 USD
 * const price: Money = { amount: 1250, currency: 'USD' };
 * ```
 */
export interface Money {
  /** Value in minor units (e.g. cents for USD, tambala for MWK). */
  amount: number;
  /** ISO 4217 currency code (upper-case). */
  currency: string;
}

const CURRENCY_CONFIG: Record<
  string,
  { decimals: number; symbol: string; locale: string }
> = {
  // Major currencies
  USD: { decimals: 2, symbol: '$', locale: 'en-US' },
  EUR: { decimals: 2, symbol: '€', locale: 'de-DE' },
  GBP: { decimals: 2, symbol: '£', locale: 'en-GB' },
  JPY: { decimals: 0, symbol: '¥', locale: 'ja-JP' },
  CHF: { decimals: 2, symbol: 'CHF', locale: 'de-CH' },
  CAD: { decimals: 2, symbol: 'C$', locale: 'en-CA' },
  AUD: { decimals: 2, symbol: 'A$', locale: 'en-AU' },
  NZD: { decimals: 2, symbol: 'NZ$', locale: 'en-NZ' },
  CNY: { decimals: 2, symbol: '¥', locale: 'zh-CN' },
  HKD: { decimals: 2, symbol: 'HK$', locale: 'zh-HK' },
  SGD: { decimals: 2, symbol: 'S$', locale: 'en-SG' },
  // African currencies
  KES: { decimals: 2, symbol: 'KSh', locale: 'en-KE' },
  MWK: { decimals: 2, symbol: 'MK', locale: 'en-MW' },
  ZAR: { decimals: 2, symbol: 'R', locale: 'en-ZA' },
  NGN: { decimals: 2, symbol: '₦', locale: 'en-NG' },
  TZS: { decimals: 2, symbol: 'TSh', locale: 'en-TZ' },
  UGX: { decimals: 0, symbol: 'USh', locale: 'en-UG' },
  RWF: { decimals: 0, symbol: 'FRw', locale: 'rw-RW' },
  ZMW: { decimals: 2, symbol: 'ZK', locale: 'en-ZM' },
  GHS: { decimals: 2, symbol: 'GH₵', locale: 'en-GH' },
  EGP: { decimals: 2, symbol: 'E£', locale: 'ar-EG' },
  MAD: { decimals: 2, symbol: 'DH', locale: 'ar-MA' },
  DZD: { decimals: 2, symbol: 'DA', locale: 'ar-DZ' },
  TND: { decimals: 3, symbol: 'DT', locale: 'ar-TN' },
  LYD: { decimals: 3, symbol: 'LD', locale: 'ar-LY' },
  SDG: { decimals: 2, symbol: 'SDG', locale: 'ar-SD' },
  ETB: { decimals: 2, symbol: 'Br', locale: 'am-ET' },
  AOA: { decimals: 2, symbol: 'Kz', locale: 'pt-AO' },
  XOF: { decimals: 0, symbol: 'CFA', locale: 'fr-SN' },
  XAF: { decimals: 0, symbol: 'FCFA', locale: 'fr-CM' },
  BWP: { decimals: 2, symbol: 'P', locale: 'en-BW' },
  MZN: { decimals: 2, symbol: 'MT', locale: 'pt-MZ' },
  NAD: { decimals: 2, symbol: 'N$', locale: 'en-NA' },
  MUR: { decimals: 2, symbol: 'Rs', locale: 'en-MU' },
  SCR: { decimals: 2, symbol: 'SR', locale: 'en-SC' },
  GMD: { decimals: 2, symbol: 'D', locale: 'en-GM' },
  SLL: { decimals: 2, symbol: 'Le', locale: 'en-SL' },
  LRD: { decimals: 2, symbol: 'L$', locale: 'en-LR' },
  CVE: { decimals: 2, symbol: '$', locale: 'pt-CV' },
  SZL: { decimals: 2, symbol: 'E', locale: 'en-SZ' },
  LSL: { decimals: 2, symbol: 'L', locale: 'en-LS' },
  MGA: { decimals: 2, symbol: 'Ar', locale: 'mg-MG' },
  KMF: { decimals: 0, symbol: 'CF', locale: 'ar-KM' },
  DJF: { decimals: 0, symbol: 'Fdj', locale: 'fr-DJ' },
  ERN: { decimals: 2, symbol: 'Nfk', locale: 'ti-ER' },
  SOS: { decimals: 2, symbol: 'Sh', locale: 'so-SO' },
  SSP: { decimals: 2, symbol: '£', locale: 'en-SS' },
  STN: { decimals: 2, symbol: 'Db', locale: 'pt-ST' },
  BIF: { decimals: 0, symbol: 'FBu', locale: 'rn-BI' },
  CDF: { decimals: 2, symbol: 'FC', locale: 'fr-CD' },
  GNF: { decimals: 0, symbol: 'FG', locale: 'fr-GN' },
  MRU: { decimals: 2, symbol: 'UM', locale: 'ar-MR' },
  ZWL: { decimals: 2, symbol: 'Z$', locale: 'en-ZW' },
  // European currencies
  SEK: { decimals: 2, symbol: 'kr', locale: 'sv-SE' },
  NOK: { decimals: 2, symbol: 'kr', locale: 'nb-NO' },
  DKK: { decimals: 2, symbol: 'kr', locale: 'da-DK' },
  ISK: { decimals: 0, symbol: 'kr', locale: 'is-IS' },
  PLN: { decimals: 2, symbol: 'zł', locale: 'pl-PL' },
  CZK: { decimals: 2, symbol: 'Kč', locale: 'cs-CZ' },
  HUF: { decimals: 2, symbol: 'Ft', locale: 'hu-HU' },
  RON: { decimals: 2, symbol: 'lei', locale: 'ro-RO' },
  BGN: { decimals: 2, symbol: 'лв', locale: 'bg-BG' },
  HRK: { decimals: 2, symbol: 'kn', locale: 'hr-HR' },
  RSD: { decimals: 2, symbol: 'din', locale: 'sr-RS' },
  UAH: { decimals: 2, symbol: '₴', locale: 'uk-UA' },
  RUB: { decimals: 2, symbol: '₽', locale: 'ru-RU' },
  BYN: { decimals: 2, symbol: 'Br', locale: 'be-BY' },
  MDL: { decimals: 2, symbol: 'L', locale: 'ro-MD' },
  ALL: { decimals: 2, symbol: 'L', locale: 'sq-AL' },
  MKD: { decimals: 2, symbol: 'ден', locale: 'mk-MK' },
  BAM: { decimals: 2, symbol: 'KM', locale: 'bs-BA' },
  GEL: { decimals: 2, symbol: '₾', locale: 'ka-GE' },
  AMD: { decimals: 2, symbol: '֏', locale: 'hy-AM' },
  AZN: { decimals: 2, symbol: '₼', locale: 'az-AZ' },
  TRY: { decimals: 2, symbol: '₺', locale: 'tr-TR' },
  // Asian currencies
  INR: { decimals: 2, symbol: '₹', locale: 'en-IN' },
  PKR: { decimals: 2, symbol: '₨', locale: 'ur-PK' },
  BDT: { decimals: 2, symbol: '৳', locale: 'bn-BD' },
  LKR: { decimals: 2, symbol: 'Rs', locale: 'si-LK' },
  NPR: { decimals: 2, symbol: 'रू', locale: 'ne-NP' },
  BTN: { decimals: 2, symbol: 'Nu.', locale: 'dz-BT' },
  MVR: { decimals: 2, symbol: 'Rf', locale: 'dv-MV' },
  AFN: { decimals: 2, symbol: '؋', locale: 'ps-AF' },
  THB: { decimals: 2, symbol: '฿', locale: 'th-TH' },
  VND: { decimals: 0, symbol: '₫', locale: 'vi-VN' },
  IDR: { decimals: 2, symbol: 'Rp', locale: 'id-ID' },
  MYR: { decimals: 2, symbol: 'RM', locale: 'ms-MY' },
  PHP: { decimals: 2, symbol: '₱', locale: 'en-PH' },
  MMK: { decimals: 2, symbol: 'K', locale: 'my-MM' },
  KHR: { decimals: 2, symbol: '៛', locale: 'km-KH' },
  LAK: { decimals: 2, symbol: '₭', locale: 'lo-LA' },
  BND: { decimals: 2, symbol: 'B$', locale: 'ms-BN' },
  TWD: { decimals: 2, symbol: 'NT$', locale: 'zh-TW' },
  KRW: { decimals: 0, symbol: '₩', locale: 'ko-KR' },
  KPW: { decimals: 2, symbol: '₩', locale: 'ko-KP' },
  MNT: { decimals: 2, symbol: '₮', locale: 'mn-MN' },
  KZT: { decimals: 2, symbol: '₸', locale: 'kk-KZ' },
  UZS: { decimals: 2, symbol: 'soʻm', locale: 'uz-UZ' },
  TJS: { decimals: 2, symbol: 'SM', locale: 'tg-TJ' },
  KGS: { decimals: 2, symbol: 'с', locale: 'ky-KG' },
  TMT: { decimals: 2, symbol: 'm', locale: 'tk-TM' },
  // Middle East currencies
  SAR: { decimals: 2, symbol: 'ر.س', locale: 'ar-SA' },
  AED: { decimals: 2, symbol: 'د.إ', locale: 'ar-AE' },
  QAR: { decimals: 2, symbol: 'ر.ق', locale: 'ar-QA' },
  KWD: { decimals: 3, symbol: 'د.ك', locale: 'ar-KW' },
  BHD: { decimals: 3, symbol: 'د.ب', locale: 'ar-BH' },
  OMR: { decimals: 3, symbol: 'ر.ع.', locale: 'ar-OM' },
  JOD: { decimals: 3, symbol: 'د.ا', locale: 'ar-JO' },
  ILS: { decimals: 2, symbol: '₪', locale: 'he-IL' },
  LBP: { decimals: 2, symbol: 'ل.ل', locale: 'ar-LB' },
  SYP: { decimals: 2, symbol: '£', locale: 'ar-SY' },
  IQD: { decimals: 3, symbol: 'ع.د', locale: 'ar-IQ' },
  IRR: { decimals: 2, symbol: '﷼', locale: 'fa-IR' },
  YER: { decimals: 2, symbol: '﷼', locale: 'ar-YE' },
  // Americas currencies
  MXN: { decimals: 2, symbol: '$', locale: 'es-MX' },
  BRL: { decimals: 2, symbol: 'R$', locale: 'pt-BR' },
  ARS: { decimals: 2, symbol: '$', locale: 'es-AR' },
  CLP: { decimals: 0, symbol: '$', locale: 'es-CL' },
  COP: { decimals: 2, symbol: '$', locale: 'es-CO' },
  PEN: { decimals: 2, symbol: 'S/', locale: 'es-PE' },
  VES: { decimals: 2, symbol: 'Bs.S', locale: 'es-VE' },
  UYU: { decimals: 2, symbol: '$U', locale: 'es-UY' },
  PYG: { decimals: 0, symbol: '₲', locale: 'es-PY' },
  BOB: { decimals: 2, symbol: 'Bs.', locale: 'es-BO' },
  GTQ: { decimals: 2, symbol: 'Q', locale: 'es-GT' },
  HNL: { decimals: 2, symbol: 'L', locale: 'es-HN' },
  NIO: { decimals: 2, symbol: 'C$', locale: 'es-NI' },
  CRC: { decimals: 2, symbol: '₡', locale: 'es-CR' },
  PAB: { decimals: 2, symbol: 'B/.', locale: 'es-PA' },
  DOP: { decimals: 2, symbol: 'RD$', locale: 'es-DO' },
  CUP: { decimals: 2, symbol: '$', locale: 'es-CU' },
  JMD: { decimals: 2, symbol: 'J$', locale: 'en-JM' },
  HTG: { decimals: 2, symbol: 'G', locale: 'fr-HT' },
  TTD: { decimals: 2, symbol: 'TT$', locale: 'en-TT' },
  BBD: { decimals: 2, symbol: 'Bds$', locale: 'en-BB' },
  BSD: { decimals: 2, symbol: 'B$', locale: 'en-BS' },
  BZD: { decimals: 2, symbol: 'BZ$', locale: 'en-BZ' },
  GYD: { decimals: 2, symbol: 'G$', locale: 'en-GY' },
  SRD: { decimals: 2, symbol: '$', locale: 'nl-SR' },
  AWG: { decimals: 2, symbol: 'ƒ', locale: 'nl-AW' },
};

/**
 * Look up the configuration for a currency code.
 *
 * Falls back to `{ decimals: 2, symbol: currency, locale: 'en-US' }`
 * for unknown currencies.
 *
 * @param currency - ISO 4217 currency code (case-insensitive).
 * @returns The currency configuration.
 * @internal
 */
function getConfig(currency: string) {
  return (
    CURRENCY_CONFIG[currency.toUpperCase()] ?? {
      decimals: 2,
      symbol: currency,
      locale: 'en-US',
    }
  );
}

/**
 * Convert a major-unit float to minor units.
 *
 * @param major    - The amount in major units (e.g. `12.50`).
 * @param currency - ISO 4217 currency code.
 * @returns The amount in minor units (e.g. `1250`).
 *
 * @example
 * ```ts
 * toMinorUnits(12.50, 'USD');  // 1250
 * toMinorUnits(100, 'JPY');    // 100  (0 decimals)
 * ```
 */
export function toMinorUnits(major: number, currency: string): number {
  const { decimals } = getConfig(currency);
  return Math.round(major * Math.pow(10, decimals));
}

/**
 * Convert minor units back to a major-unit float.
 *
 * @param minor    - The amount in minor units (e.g. `1250`).
 * @param currency - ISO 4217 currency code.
 * @returns The amount in major units (e.g. `12.50`).
 *
 * @example
 * ```ts
 * toMajorUnits(1250, 'USD');  // 12.5
 * ```
 */
export function toMajorUnits(minor: number, currency: string): number {
  const { decimals } = getConfig(currency);
  return minor / Math.pow(10, decimals);
}

/**
 * Create a {@link Money} object from a major-unit (human-readable) amount.
 *
 * @param amount   - The amount in major units (e.g. `12.50`).
 * @param currency - ISO 4217 currency code.
 * @returns A new `Money` with the amount stored in minor units.
 *
 * @example
 * ```ts
 * money(12.50, 'USD');  // { amount: 1250, currency: 'USD' }
 * ```
 */
export function money(amount: number, currency: string): Money {
  return {
    amount: toMinorUnits(amount, currency),
    currency: currency.toUpperCase(),
  };
}

/**
 * Create a {@link Money} object directly from a minor-unit value.
 *
 * @param minorAmount - The amount already in minor units.
 * @param currency    - ISO 4217 currency code.
 * @returns A new `Money` object.
 *
 * @example
 * ```ts
 * moneyFromMinor(1250, 'USD');  // { amount: 1250, currency: 'USD' }
 * ```
 */
export function moneyFromMinor(minorAmount: number, currency: string): Money {
  return { amount: Math.round(minorAmount), currency: currency.toUpperCase() };
}

/**
 * Add two {@link Money} values (must share the same currency).
 *
 * @param a - First operand.
 * @param b - Second operand.
 * @returns A new `Money` with the summed amount.
 * @throws {Error} If the currencies do not match.
 */
export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount + b.amount, currency: a.currency };
}

/**
 * Subtract `b` from `a` (must share the same currency).
 *
 * @param a - Minuend.
 * @param b - Subtrahend.
 * @returns A new `Money` with the difference.
 * @throws {Error} If the currencies do not match.
 */
export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount - b.amount, currency: a.currency };
}

/**
 * Multiply a {@link Money} value by a scalar factor.
 *
 * The result is rounded to the nearest minor unit.
 *
 * @param m      - The monetary value.
 * @param factor - The multiplier (e.g. quantity).
 * @returns A new `Money` with the scaled amount.
 */
export function multiplyMoney(m: Money, factor: number): Money {
  return { amount: Math.round(m.amount * factor), currency: m.currency };
}

/**
 * Calculate a percentage of a {@link Money} value.
 *
 * @param m       - The base monetary value.
 * @param percent - The percentage (e.g. `15` for 15%).
 * @returns A new `Money` representing `percent%` of `m`.
 *
 * @example
 * ```ts
 * percentOf(money(200, 'USD'), 15);  // $30.00
 * ```
 */
export function percentOf(m: Money, percent: number): Money {
  return {
    amount: Math.round(m.amount * (percent / 100)),
    currency: m.currency,
  };
}

/**
 * Split a {@link Money} value into `n` equal parts.
 *
 * The remainder (caused by integer division) is distributed one minor
 * unit at a time across the **first** parts, so the total is always exact.
 *
 * @param m     - The monetary value to split.
 * @param parts - Number of parts.
 * @returns An array of `Money` objects whose amounts sum to `m.amount`.
 *
 * @example
 * ```ts
 * splitMoney(money(10, 'USD'), 3);
 * // [{ amount: 334, ... }, { amount: 333, ... }, { amount: 333, ... }]
 * ```
 */
export function splitMoney(m: Money, parts: number): Money[] {
  const base = Math.floor(m.amount / parts);
  const remainder = m.amount - base * parts;

  return Array.from({ length: parts }, (_, i) => ({
    amount: base + (i < remainder ? 1 : 0),
    currency: m.currency,
  }));
}

/**
 * Format a {@link Money} value for display using locale-aware
 * `Intl.NumberFormat`.
 *
 * Falls back to `"{symbol} {amount}"` if the locale is unsupported.
 *
 * @param m - The monetary value.
 * @returns A formatted string, e.g. `"KSh 1,250.00"`.
 *
 * @example
 * ```ts
 * formatMoney(money(1250, 'KES'));  // "KSh 1,250.00"
 * formatMoney(money(100, 'JPY'));   // "¥100"
 * ```
 */
export function formatMoney(m: Money): string {
  const config = getConfig(m.currency);
  const major = toMajorUnits(m.amount, m.currency);

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: m.currency,
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    }).format(major);
  } catch {
    return `${config.symbol} ${major.toFixed(config.decimals)}`;
  }
}

/**
 * Format a {@link Money} value as a plain numeric string with the
 * correct number of decimal places for the currency.
 *
 * @param m - The monetary value.
 * @returns A numeric string, e.g. `"1250.00"`.
 */
export function formatMoneyNumeric(m: Money): string {
  const config = getConfig(m.currency);
  return toMajorUnits(m.amount, m.currency).toFixed(config.decimals);
}

/**
 * Check if a {@link Money} value is exactly zero.
 *
 * @param m - The monetary value.
 * @returns `true` if `amount === 0`.
 */
export function isZero(m: Money): boolean {
  return m.amount === 0;
}

/**
 * Check if a {@link Money} value is positive (greater than zero).
 *
 * @param m - The monetary value.
 * @returns `true` if `amount > 0`.
 */
export function isPositive(m: Money): boolean {
  return m.amount > 0;
}

/**
 * Check if a {@link Money} value is negative (less than zero).
 *
 * @param m - The monetary value.
 * @returns `true` if `amount < 0`.
 */
export function isNegative(m: Money): boolean {
  return m.amount < 0;
}

/**
 * Compare two {@link Money} values (must share the same currency).
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns `-1` if `a < b`, `0` if equal, `1` if `a > b`.
 * @throws {Error} If the currencies do not match.
 */
export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  if (a.amount < b.amount) return -1;
  if (a.amount > b.amount) return 1;
  return 0;
}

// ── Currency Conversion (high-precision) ───────────────

/**
 * Exchange rate precision — rates are stored as integers
 * scaled by 10^RATE_PRECISION to avoid floating-point loss.
 * e.g. rate 1726.504321 → stored as 1726504321000000 (×10^12)
 */
const RATE_PRECISION = 12;
const RATE_SCALE = Math.pow(10, RATE_PRECISION);

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number; // human-readable rate (e.g. 1726.504321)
  /** Internal scaled integer — do not set manually. */
  _scaled: bigint;
  timestamp?: string;
  source?: string;
}

/**
 * Create an ExchangeRate with full precision preserved.
 *
 * @example
 * exchangeRate('USD', 'MWK', 1726.504321)
 * exchangeRate('MWK', 'USD', 0.000579203) // inverse — 6+ decimals preserved
 * exchangeRate('USD', 'KES', 129.853)
 */
export function exchangeRate(
  from: string,
  to: string,
  rate: number,
  source?: string,
): ExchangeRate {
  return {
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    rate,
    _scaled: rateToBigInt(rate),
    timestamp: new Date().toISOString(),
    source,
  };
}

/**
 * Convert a Money value to another currency using an ExchangeRate.
 * Preserves maximum precision during calculation.
 *
 * @example
 * const usd = money(100, 'USD');               // $100.00
 * const rate = exchangeRate('USD', 'MWK', 1726.504321);
 * const mwk = convertMoney(usd, rate);          // MK 172,650.43
 *
 * // Works with tiny inverse rates too:
 * const rateInv = exchangeRate('MWK', 'USD', 0.000579203);
 * const back = convertMoney(mwk, rateInv);      // ≈ $100.00
 */
export function convertMoney(m: Money, rate: ExchangeRate): Money {
  if (m.currency !== rate.from) {
    throw new Error(
      `Currency mismatch: money is ${m.currency} but rate is from ${rate.from}`,
    );
  }

  const targetConfig = getConfig(rate.to);
  const sourceConfig = getConfig(m.currency);

  // Convert source minor units → major units as bigint numerator
  // Then multiply by the scaled rate and divide by scale factors
  // All done in bigint to avoid any floating-point loss

  const amountBig = BigInt(m.amount);
  const scaledResult = amountBig * rate._scaled;

  // We need to adjust for:
  // 1. The source currency's decimal shift (divide out)
  // 2. The rate scale (divide out RATE_SCALE)
  // 3. The target currency's decimal shift (already in target minor units)
  const sourceFactor = BigInt(Math.pow(10, sourceConfig.decimals));
  const targetFactor = BigInt(Math.pow(10, targetConfig.decimals));
  const scaleBig = BigInt(RATE_SCALE);

  // result_minor = (amount_minor × scaled_rate × target_factor) / (source_factor × RATE_SCALE)
  const numerator = scaledResult * targetFactor;
  const denominator = sourceFactor * scaleBig;
  const resultMinor = Number((numerator + denominator / 2n) / denominator); // round half up

  return {
    amount: resultMinor,
    currency: rate.to,
  };
}

/**
 * Get the inverse of an exchange rate with full precision.
 *
 * @example
 * const usdToMwk = exchangeRate('USD', 'MWK', 1726.504321);
 * const mwkToUsd = inverseRate(usdToMwk);
 * // mwkToUsd.rate ≈ 0.000579203...
 */
export function inverseRate(rate: ExchangeRate): ExchangeRate {
  const inverseValue = 1 / rate.rate;
  return exchangeRate(rate.to, rate.from, inverseValue, rate.source);
}

/**
 * Calculate a cross rate from two rates sharing a common currency.
 *
 * @example
 * const usdToKes = exchangeRate('USD', 'KES', 129.853);
 * const usdToMwk = exchangeRate('USD', 'MWK', 1726.504321);
 * const kesToMwk = crossRate(usdToKes, usdToMwk);
 * // kesToMwk.rate ≈ 13.296...
 */
export function crossRate(
  rateA: ExchangeRate,
  rateB: ExchangeRate,
): ExchangeRate {
  // A: X→Y,  B: X→Z  ⇒  result: Y→Z  = B.rate / A.rate
  if (rateA.from === rateB.from) {
    const cross = rateB.rate / rateA.rate;
    return exchangeRate(rateA.to, rateB.to, cross);
  }
  // A: X→Y,  B: Y→Z  ⇒  result: X→Z  = A.rate × B.rate
  if (rateA.to === rateB.from) {
    const cross = rateA.rate * rateB.rate;
    return exchangeRate(rateA.from, rateB.to, cross);
  }

  throw new Error(
    `Cannot compute cross rate: no common currency between ${rateA.from}→${rateA.to} and ${rateB.from}→${rateB.to}`,
  );
}

/**
 * Apply a markup/spread percentage to a rate.
 * Positive = increase rate (sell side), negative = decrease (buy side).
 *
 * @example
 * const base = exchangeRate('USD', 'MWK', 1726.50);
 * const sell = applySpread(base, 2.5);  // +2.5% markup → 1769.6625
 * const buy  = applySpread(base, -1.0); // -1.0% discount → 1709.235
 */
export function applySpread(
  rate: ExchangeRate,
  spreadPercent: number,
): ExchangeRate {
  const adjusted = rate.rate * (1 + spreadPercent / 100);
  return exchangeRate(rate.from, rate.to, adjusted, rate.source);
}

/**
 * Calculate the mid-rate between a buy and sell rate.
 */
export function midRate(
  buyRate: ExchangeRate,
  sellRate: ExchangeRate,
): ExchangeRate {
  if (buyRate.from !== sellRate.from || buyRate.to !== sellRate.to) {
    throw new Error('Buy and sell rates must be for the same currency pair');
  }
  const mid = (buyRate.rate + sellRate.rate) / 2;
  return exchangeRate(buyRate.from, buyRate.to, mid);
}

/**
 * Calculate the spread percentage between buy and sell rates.
 */
export function spreadPercent(
  buyRate: ExchangeRate,
  sellRate: ExchangeRate,
): number {
  const mid = (buyRate.rate + sellRate.rate) / 2;
  if (mid === 0) return 0;
  const factor = Math.pow(10, 6);
  return (
    Math.round(((sellRate.rate - buyRate.rate) / mid) * 100 * factor) / factor
  );
}

/**
 * Format an exchange rate for display with full precision.
 *
 * @example
 * formatRate(exchangeRate('USD', 'MWK', 1726.504321))
 * // "1 USD = 1,726.504321 MWK"
 *
 * formatRate(exchangeRate('MWK', 'USD', 0.000579203), 6)
 * // "1 MWK = 0.000579 USD"
 */
export function formatRate(rate: ExchangeRate, precision?: number): string {
  const dp = precision ?? Math.max(2, significantRateDecimals(rate.rate));
  const formatted = rate.rate.toFixed(dp);
  return `1 ${rate.from} = ${formatted} ${rate.to}`;
}

/**
 * Determine how many decimal places are visually significant for a rate.
 *
 * - Rates ≥ 1: up to 6 decimals.
 * - Rates < 1 (e.g. `0.000579`): enough to show 4 significant digits.
 *
 * @param rate - The exchange rate value.
 * @returns The number of decimals to display.
 * @internal
 */
function significantRateDecimals(rate: number): number {
  if (rate >= 1) {
    // For rates >= 1, show up to 6 decimals
    const str = rate.toString();
    const dot = str.indexOf('.');
    return dot === -1 ? 0 : Math.min(str.length - dot - 1, 6);
  }
  // For rates < 1 (e.g. 0.000579), show enough to get 4 significant digits
  const str = rate.toFixed(20);
  let firstNonZero = -1;
  for (let i = 2; i < str.length; i++) {
    if (str[i] !== '0') {
      firstNonZero = i;
      break;
    }
  }
  return firstNonZero === -1 ? 6 : firstNonZero - 1 + 4;
}

/**
 * Convert a human-readable rate to a scaled `BigInt` for precision math.
 *
 * The rate is multiplied by `10^RATE_PRECISION` (10^12) and stored as
 * a `BigInt` using string manipulation to avoid float errors.
 *
 * @param rate - The human-readable exchange rate.
 * @returns The rate as a scaled `BigInt`.
 * @internal
 */
function rateToBigInt(rate: number): bigint {
  // Multiply rate by RATE_SCALE and convert to bigint
  // Use string manipulation to avoid float errors
  const rateStr = rate.toFixed(RATE_PRECISION);
  const [intPart, fracPart = ''] = rateStr.split('.');
  const padded = (intPart + fracPart.padEnd(RATE_PRECISION, '0')).slice(
    0,
    intPart.length + RATE_PRECISION,
  );
  return BigInt(padded);
}

// ── Helpers ────────────────────────────────────────────

/**
 * Assert that two {@link Money} values share the same currency.
 *
 * @param a - First money value.
 * @param b - Second money value.
 * @throws {Error} If currencies differ.
 * @internal
 */
function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}
