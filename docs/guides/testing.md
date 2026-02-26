# Testing Guide

## Overview

Triply uses **Jest 30** as the test runner, configured via Nx for workspace-wide orchestration. Tests are co-located with source files using the `.spec.ts` extension. End-to-end tests live in a separate `triply.api-e2e` project.

## Test Types

| Type     | Location                   | Extension      | Runner                      |
| -------- | -------------------------- | -------------- | --------------------------- |
| **Unit** | Next to source file        | `.spec.ts`     | `npx nx test <project>`     |
| **E2E**  | `apps/triply.api-e2e/src/` | `.e2e-spec.ts` | `npx nx e2e triply.api-e2e` |

## Running Tests

### Unit Tests

```bash
# Run tests for the API app
npx nx test triply.api

# Run tests for a specific library
npx nx test shared
npx nx test database
npx nx test amadeus

# Run all tests across the workspace
npm run test:all
# or
npx nx run-many -t test

# Run only tests affected by current changes
npm run test:affected

# Watch mode (re-runs on file change)
npm run test:watch

# With coverage report
npm run test:coverage

# Debug mode (sequential, no parallelism)
npm run test:debug
```

### End-to-End Tests

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with production config
npm run test:e2e:prod
```

## Test Configuration

### Workspace-Level (`jest.config.ts`)

The root `jest.config.ts` configures the Nx Jest preset for the entire workspace.

### Project-Level (`jest.config.ts`)

Each project has its own Jest config that extends the root preset:

```typescript
// apps/triply.api/jest.config.ts
export default {
  displayName: 'triply.api',
  preset: '../../jest.preset.js',
  // ...
};
```

### SWC Transform

Tests use `@swc/jest` for fast TypeScript transpilation (no `ts-jest` overhead).

## Writing Tests

### File Placement

Place test files next to the code they test:

```
services/
├── flights.service.ts
└── flights.service.spec.ts
```

### Test Structure

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { FlightsService } from './flights.service';

describe('FlightsService', () => {
  let service: FlightsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlightsService,
        {
          provide: AmadeusClient,
          useValue: { shopping: { flightOffersSearch: { get: jest.fn() } } },
        },
      ],
    }).compile();

    service = module.get<FlightsService>(FlightsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should call Amadeus with correct parameters', async () => {
      // Arrange
      const mockResult = { data: [{ id: '1' }] };
      jest.spyOn(amadeus.shopping.flightOffersSearch, 'get').mockResolvedValue(mockResult);

      // Act
      const result = await service.search('JFK', 'LAX', '2026-06-15', '2');

      // Assert
      expect(result).toEqual(mockResult);
    });
  });
});
```

### Mocking Best Practices

- Use `jest.fn()` and `jest.spyOn()` for method mocks.
- Use NestJS `Test.createTestingModule()` for DI-aware tests.
- Mock external services (Amadeus, databases) at the provider level.
- Never mock the class under test.

## Coverage

```bash
# Generate coverage report
npx nx test triply.api --coverage

# Coverage report is generated in:
# coverage/apps/triply.api/
```

**Target:** Aim for >80% line coverage on business logic.

## Nx Test Caching

Nx caches test results. If source files haven't changed, tests are replayed from cache:

```bash
# Force re-run (skip cache)
npx nx test triply.api --skip-nx-cache

# Clear all caches
npx nx reset
```

## CI Integration

Tests run automatically in the CI pipeline (`.github/workflows/ci.yml`):

```yaml
- run: npx nx run-many -t lint test build
```

Nx Cloud provides:

- **Remote caching** — share test results across CI runs and team members.
- **Distributed execution** — split tests across multiple machines.

## Next Steps

- [Contributing →](./contributing.md)
- [Deployment →](./deployment.md)
