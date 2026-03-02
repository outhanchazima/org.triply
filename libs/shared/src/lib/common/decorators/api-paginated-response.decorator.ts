import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * Swagger decorator that documents a paginated endpoint response.
 *
 * Generates an `ApiOkResponse` schema matching the {@link PaginatedResponse}
 * envelope: `{ success, data: T[], pagination, meta }`.
 *
 * @typeParam TModel - The DTO / entity class used for each item in the array.
 * @param model - The class reference (must be decorated with Swagger decorators).
 *
 * @example
 * ```ts
 * @Get()
 * @ApiPaginatedResponse(FlightDto)
 * findAll(@Query() query: PaginationQueryDto) { ... }
 * ```
 */
export const ApiPaginatedResponse = <TModel extends Type>(model: TModel) =>
  applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      schema: {
        allOf: [
          {
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'number', example: 1 },
                  limit: { type: 'number', example: 20 },
                  total: { type: 'number', example: 100 },
                  totalPages: { type: 'number', example: 5 },
                  hasNext: { type: 'boolean', example: true },
                  hasPrevious: { type: 'boolean', example: false },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string' },
                  path: { type: 'string' },
                  requestId: { type: 'string' },
                },
              },
            },
          },
        ],
      },
    }),
  );
