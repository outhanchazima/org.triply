import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

/**
 * Pipe that parses an optional string parameter into an integer.
 *
 * - `undefined`, `null`, or empty strings are passed through as `undefined`.
 * - Valid numeric strings are parsed with `parseInt(value, 10)`.
 * - Non-numeric strings throw a `400 Bad Request`.
 *
 * Useful for optional query parameters like `?page=2` where the parameter
 * may be absent entirely.
 *
 * @example
 * ```ts
 * @Get()
 * findAll(@Query('page', ParseOptionalIntPipe) page?: number) { ... }
 * ```
 */
@Injectable()
export class ParseOptionalIntPipe implements PipeTransform<
  string | undefined,
  number | undefined
> {
  /**
   * @param value    - The raw query/param string value.
   * @param metadata - NestJS argument metadata (used for error messages).
   * @returns The parsed integer, or `undefined` if the value is absent.
   * @throws {BadRequestException} If the value is present but not a valid integer.
   */
  transform(
    value: string | undefined,
    metadata: ArgumentMetadata,
  ): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new BadRequestException(
        `${metadata.data || 'Parameter'} must be a valid integer`,
      );
    }

    return parsed;
  }
}
