/\*\*

- @fileoverview NestJS Feature Modules - Best Practices
- @module database/modules/PATTERNS
- @description This document outlines NestJS patterns used in the database module
- for managing multi-database (PostgreSQL, MongoDB, Redis) connections with
- feature-scoped schema registration.
-
- ## Architecture Overview
-
- ┌─────────────────────────────────────────────────────────┐
- │ AppModule │
- │ imports: [DatabaseModule.forRoot(config)] │
- └────────────────┬────────────────────────────────────────┘
-                  │
-         ┌────────┴──────────┬──────────────┐
-         │                   │              │
- ┌────▼────┐ ┌────────▼──────┐ ┌───▼────────┐
- │ AuthModule │ │ UsersModule │ │FlightsModule│
- │ imports: [ │ │ imports: [ │ │ imports: [ │
- │ AuthDB │ │ UserDB │ │ FlightsDB │
- │ Module │ │ Module │ │ Module │
- │ ] │ │ ] │ │ ] │
- └────────────┘ └───────────────┘ └─────────────┘
-
- ## Pattern: Feature Database Modules
-
- Each feature that needs database access should:
-
- 1.  Create a feature-database module (e.g., AuthDatabaseModule)
- 2.  Register relevant MongoDB schemas with MongooseModule.forFeature()
- 3.  Provide repositories for accessing those entities
- 4.  Export the repositories for use in the feature module
-
- ```typescript

  ```

- // ── auth-database.module.ts ──
- @Module({
- imports: [
-     MongooseModule.forFeature([
-       { name: 'User', schema: UserSchema },
-       { name: 'RefreshToken', schema: RefreshTokenSchema },
-     ]),
- ],
- providers: [UserRepository, RefreshTokenRepository],
- exports: [UserRepository, RefreshTokenRepository],
- })
- export class AuthDatabaseModule {}
-
- // ── auth.module.ts ──
- @Module({
- imports: [AuthDatabaseModule],
- providers: [AuthService],
- controllers: [AuthController],
- })
- export class AuthModule {}
-
- // ── auth.service.ts ──
- @Injectable()
- export class AuthService {
- constructor(
-     private readonly userRepo: UserRepository,
-     private readonly tokenRepo: RefreshTokenRepository,
- ) {}
- }
- ```

  ```

-
- ## Benefits
-
- ✅ **Separation of Concerns**: Database configuration is isolated from business logic
- ✅ **Dependency Injection**: Repositories are injected, making them testable
- ✅ **Type Safety**: Full TypeScript support for entities and operations
- ✅ **Lazy Loading**: Feature modules only load schemas they need
- ✅ **Reusability**: Database modules can be distributed across projects
- ✅ **Testing**: Easy to mock repositories for unit tests
-
- ## Decorators Usage
-
- Decorators from @org.triply/database are used in controllers:
-
- ```typescript

  ```

- @Controller('users')
- @ApiFilters({
- filterFields: { email: ['exact', 'icontains'], age: ['gte', 'lte'] },
- searchFields: ['email', 'name'],
- orderingFields: ['createdAt', 'email'],
- })
- export class UserController {
- @Get()
- findAll(@Filtered() query: QueryOptions) {
-     return this.userService.findMany(query);
- }
-
- @Get('search')
- search(@SearchQuery() search: SearchOptions) {
-     return this.userService.search(search);
- }
-
- @Get()
- list(
-     @QueryFilters() filters: FilterOptions[],
-     @Ordering() sort: SortOptions[],
-     @Pagination() paging: PaginationParams,
- ) {
-     return this.userService.findMany({
-       filters,
-       sort,
-       offset: paging.offset,
-       limit: paging.limit,
-     });
- }
- }
- ```

  ```

-
- ## PostgreSQL Usage (TypeORM)
-
- For PostgreSQL entities, create a similar pattern using TypeORM repositories:
-
- ```typescript

  ```

- @Module({
- imports: [
-     TypeOrmModule.forFeature([Flight], 'postgres-connection-name'),
- ],
- providers: [FlightRepository],
- exports: [FlightRepository],
- })
- export class FlightDatabaseModule {}
- ```

  ```

-
- ## Redis Usage
-
- Redis clients are accessed through the RedisService:
-
- ```typescript

  ```

- @Injectable()
- export class CacheService {
- constructor(private readonly redisService: RedisService) {}
-
- async get(key: string) {
-     const redis = this.redisService.getClient('cache');
-     return redis.get(key);
- }
- }
- ```

  ```

-
- ## Global Interceptors
-
- The QueryFilterInterceptor can be globally applied in main.ts:
-
- ```typescript

  ```

- async function bootstrap() {
- const app = await NestFactory.create(AppModule);
- app.useGlobalInterceptors(new QueryFilterInterceptor());
- await app.listen(3000);
- }
- ```
  */
  ```

export const NESTJS_PATTERN_NOTES = `NestJS Patterns Documentation - See file for detailed patterns.`;
