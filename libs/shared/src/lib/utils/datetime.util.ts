import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addWeeks,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceToNow,
  formatDuration,
  intervalToDuration,
  isAfter,
  isBefore,
  isFuture,
  isPast,
  isSameDay,
  isToday,
  isWeekend,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subHours,
  subMonths,
  subWeeks,
} from 'date-fns';

// ── Parsing ────────────────────────────────────────────

/**
 * Normalise a date input: parse an ISO 8601 string via `date-fns/parseISO`,
 * or return a `Date` object unchanged.
 *
 * All other helpers in this module accept `string | Date` and call this
 * internally, so you rarely need it directly.
 *
 * @param input - An ISO date string or a `Date` instance.
 * @returns A `Date` object.
 */
export function toDate(input: string | Date): Date {
  return typeof input === 'string' ? parseISO(input) : input;
}

// ── Formatting ─────────────────────────────────────────

/**
 * Format a date as an ISO date string: `"2026-02-25"`.
 *
 * @param date - A date string or `Date` object.
 * @returns Formatted date string (`yyyy-MM-dd`).
 */
export function formatDate(date: string | Date): string {
  return format(toDate(date), 'yyyy-MM-dd');
}

/**
 * Format a date as `"2026-02-25 14:30:00"` (24-hour, no timezone).
 *
 * @param date - A date string or `Date` object.
 * @returns Formatted date-time string.
 */
export function formatDateTime(date: string | Date): string {
  return format(toDate(date), 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Format a date in a human-friendly style: `"25 Feb 2026"`.
 *
 * @param date - A date string or `Date` object.
 * @returns Formatted date string.
 */
export function formatDateHuman(date: string | Date): string {
  return format(toDate(date), 'dd MMM yyyy');
}

/**
 * Format a date and time in a human-friendly style: `"25 Feb 2026, 2:30 PM"`.
 *
 * @param date - A date string or `Date` object.
 * @returns Formatted date-time string.
 */
export function formatDateTimeHuman(date: string | Date): string {
  return format(toDate(date), 'dd MMM yyyy, h:mm a');
}

/**
 * Format time only in 24-hour format: `"14:30"`.
 *
 * @param date - A date string or `Date` object.
 * @returns Formatted time string (`HH:mm`).
 */
export function formatTime(date: string | Date): string {
  return format(toDate(date), 'HH:mm');
}

/**
 * Format time in 12-hour format: `"2:30 PM"`.
 *
 * @param date - A date string or `Date` object.
 * @returns Formatted time string (`h:mm a`).
 */
export function formatTime12h(date: string | Date): string {
  return format(toDate(date), 'h:mm a');
}

/**
 * Human-readable relative time: `"3 hours ago"`, `"in 2 days"`, etc.
 *
 * @param date - A date string or `Date` object.
 * @returns A relative time description with suffix.
 *
 * @example
 * ```ts
 * timeAgo('2026-02-25T10:00:00Z');  // "3 hours ago"
 * ```
 */
export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(toDate(date), { addSuffix: true });
}

// ── Duration ───────────────────────────────────────────

/**
 * Compute a human-readable duration string between two dates.
 *
 * @param start - Start date.
 * @param end   - End date.
 * @returns A formatted duration, e.g. `"2 hours 15 minutes"`.
 *
 * @example
 * ```ts
 * durationBetween('2026-02-25T08:00:00Z', '2026-02-25T10:15:00Z');
 * // "2 hours 15 minutes"
 * ```
 */
export function durationBetween(
  start: string | Date,
  end: string | Date,
): string {
  const duration = intervalToDuration({
    start: toDate(start),
    end: toDate(end),
  });
  return formatDuration(duration);
}

/**
 * Calculate the difference between two dates in **seconds**.
 *
 * @param start - Start date.
 * @param end   - End date.
 * @returns Whole seconds between `start` and `end`.
 */
export function diffInSeconds(
  start: string | Date,
  end: string | Date,
): number {
  return differenceInSeconds(toDate(end), toDate(start));
}

/**
 * Calculate the difference between two dates in **minutes**.
 *
 * @param start - Start date.
 * @param end   - End date.
 * @returns Whole minutes between `start` and `end`.
 */
export function diffInMinutes(
  start: string | Date,
  end: string | Date,
): number {
  return differenceInMinutes(toDate(end), toDate(start));
}

/**
 * Calculate the difference between two dates in **hours**.
 *
 * @param start - Start date.
 * @param end   - End date.
 * @returns Whole hours between `start` and `end`.
 */
export function diffInHours(start: string | Date, end: string | Date): number {
  return differenceInHours(toDate(end), toDate(start));
}

/**
 * Calculate the difference between two dates in **calendar days**.
 *
 * @param start - Start date.
 * @param end   - End date.
 * @returns Whole days between `start` and `end`.
 */
export function diffInDays(start: string | Date, end: string | Date): number {
  return differenceInDays(toDate(end), toDate(start));
}

// ── Checks ─────────────────────────────────────────────

export { isAfter, isBefore, isFuture, isPast, isSameDay, isToday, isWeekend };

/**
 * Check if a date is in the past (has expired).
 *
 * @param date - A date string or `Date` object.
 * @returns `true` if the date is before `now`.
 */
export function isExpired(date: string | Date): boolean {
  return isPast(toDate(date));
}

/**
 * Check if a date falls within the next N minutes from now.
 *
 * @param date    - A future date to check.
 * @param minutes - The time window in minutes.
 * @returns `true` if `date` is after now **and** before `now + minutes`.
 *
 * @example
 * ```ts
 * // Check if a flight departs within the next 30 minutes
 * isWithinMinutes(flight.departureTime, 30);
 * ```
 */
export function isWithinMinutes(date: string | Date, minutes: number): boolean {
  const d = toDate(date);
  const now = new Date();
  return isAfter(d, now) && isBefore(d, addMinutes(now, minutes));
}

// ── Manipulation ───────────────────────────────────────

export { addDays, addHours, addMinutes, addMonths, addWeeks };
export { subDays, subHours, subMonths, subWeeks };

export {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
};

// ── Ranges ─────────────────────────────────────────────

/**
 * Generate an array of `Date` objects for each calendar day between
 * `start` and `end` (inclusive).
 *
 * @param start - Range start date.
 * @param end   - Range end date.
 * @returns An array of `Date` objects (one per day, at start-of-day).
 *
 * @example
 * ```ts
 * dateRange('2026-02-25', '2026-02-28');
 * // [Feb 25, Feb 26, Feb 27, Feb 28]
 * ```
 */
export function dateRange(start: string | Date, end: string | Date): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(toDate(start));
  const last = startOfDay(toDate(end));

  while (!isAfter(current, last)) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

// ── Timezone helpers ───────────────────────────────────

/**
 * Get the current date-time as a UTC ISO 8601 string.
 *
 * @returns An ISO string, e.g. `"2026-02-25T17:00:00.000Z"`.
 */
export function nowUTC(): string {
  return new Date().toISOString();
}

/**
 * Get the Unix timestamp (seconds since epoch) for a date.
 *
 * Defaults to `now` if no date is provided.
 *
 * @param date - Optional date string or `Date` object.
 * @returns Integer seconds since 1970-01-01T00:00:00Z.
 */
export function unixTimestamp(date?: string | Date): number {
  const d = date ? toDate(date) : new Date();
  return Math.floor(d.getTime() / 1000);
}

/**
 * Create a `Date` from a Unix timestamp (seconds).
 *
 * @param timestamp - Seconds since epoch.
 * @returns A `Date` object.
 *
 * @example
 * ```ts
 * fromUnixTimestamp(1740500000);
 * // 2025-02-25T17:33:20.000Z
 * ```
 */
export function fromUnixTimestamp(timestamp: number): Date {
  return new Date(timestamp * 1000);
}
