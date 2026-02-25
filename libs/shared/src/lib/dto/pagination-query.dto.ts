import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query DTO for paginated list endpoints.
 *
 * Provides `page` (1-based) and `limit` (max 100) with sensible defaults.
 * Use the computed `skip` getter to pass directly to your ORM's offset.
 *
 * @example
 * ```ts
 * @Get()
 * findAll(@Query() query: PaginationQueryDto) {
 *   return this.service.findAll(query.skip, query.limit);
 * }
 * ```
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
    description: 'Items per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  /**
   * Computed offset for database queries.
   *
   * @returns The number of items to skip: `(page - 1) * limit`.
   */
  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
