import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Validation pipe that automatically trims whitespace from string inputs.
 *
 * - When the input is a plain `string`, it is trimmed directly.
 * - When the input is an **object** and `isDeep` is `true` (default),
 *   every string-valued property on the top level is trimmed.
 * - Other types are passed through unchanged.
 *
 * @example
 * ```ts
 * // Apply globally
 * app.useGlobalPipes(new TrimStringPipe());
 *
 * // Or per-parameter
 * @Body(new TrimStringPipe()) dto: CreateFlightDto
 * ```
 */
@Injectable()
export class TrimStringPipe implements PipeTransform {
  private readonly isDeep: boolean;

  /**
   * @param isDeep - When `true` (default), string properties inside
   *   plain objects are also trimmed.
   */
  constructor(isDeep = true) {
    this.isDeep = isDeep;
  }

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'object' && value !== null && this.isDeep) {
      return this.trimObject(value as Record<string, unknown>);
    }

    return value;
  }

  private trimObject(obj: Record<string, unknown>): Record<string, unknown> {
    const trimmed: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      trimmed[key] = typeof val === 'string' ? val.trim() : val;
    }
    return trimmed;
  }
}
