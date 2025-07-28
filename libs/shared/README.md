# @org.triply/shared

A shared NestJS library containing common functionality, utilities, and reusable components for the OrgTriply backend monorepo.

## 📦 Overview

This library provides shared functionality that can be used across multiple applications and services within the OrgTriply ecosystem. It follows NestJS module patterns and best practices for reusable code.

## 🚀 Installation

This library is automatically available to all applications in the monorepo. To use it in your application:

```typescript
import { SharedModule } from '@org.triply/shared';

@Module({
  imports: [SharedModule],
  // ...
})
export class YourModule {}
```

## 📁 Structure

```
libs/shared/
├── src/
│   ├── index.ts              # Public API exports
│   └── lib/
│       ├── shared.module.ts  # Main NestJS module
│       ├── services/         # Shared services
│       ├── interfaces/       # TypeScript interfaces
│       ├── types/           # Type definitions
│       ├── decorators/      # Custom decorators
│       ├── guards/          # Auth guards
│       ├── interceptors/    # Request/response interceptors
│       ├── pipes/           # Validation pipes
│       └── utils/           # Utility functions
├── package.json             # Library configuration
├── tsconfig.lib.json        # TypeScript config
├── jest.config.ts          # Test configuration
└── README.md               # This file
```

## 🛠️ Development

### Building

```bash
# Build the library
npx nx build shared

# Build with dependencies
npx nx build shared --with-deps
```

### Testing

```bash
# Run unit tests
npx nx test shared

# Run tests in watch mode
npx nx test shared --watch

# Run tests with coverage
npx nx test shared --coverage
```

### Linting

```bash
# Lint the library
npx nx lint shared

# Auto-fix linting issues
npx nx lint shared --fix
```

## 📚 Usage Examples

### Importing the Module

```typescript
import { Module } from '@nestjs/common';
import { SharedModule } from '@org.triply/shared';

@Module({
  imports: [SharedModule],
  controllers: [YourController],
  providers: [YourService],
})
export class YourModule {}
```

### Using Shared Services

```typescript
import { Injectable } from '@nestjs/common';
import { SomeSharedService } from '@org.triply/shared';

@Injectable()
export class YourService {
  constructor(private readonly sharedService: SomeSharedService) {}

  async doSomething() {
    return this.sharedService.performOperation();
  }
}
```

### Using Shared Types

```typescript
import { SomeInterface, SomeType } from '@org.triply/shared';

export class YourClass implements SomeInterface {
  property: SomeType;

  method(): SomeType {
    // implementation
  }
}
```

## 🔧 Adding New Functionality

### Adding a Service

1. Create the service file in `src/lib/services/`
2. Export it from `src/lib/shared.module.ts`
3. Export it from `src/index.ts`

```typescript
// src/lib/services/new-service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class NewService {
  doSomething(): string {
    return 'Hello from shared service!';
  }
}
```

```typescript
// src/lib/shared.module.ts
import { Module } from '@nestjs/common';
import { NewService } from './services/new-service';

@Module({
  providers: [NewService],
  exports: [NewService],
})
export class SharedModule {}
```

```typescript
// src/index.ts
export * from './lib/shared.module';
export * from './lib/services/new-service';
```

### Adding Types/Interfaces

1. Create the type file in `src/lib/types/` or `src/lib/interfaces/`
2. Export it from `src/index.ts`

```typescript
// src/lib/interfaces/user.interface.ts
export interface User {
  id: string;
  email: string;
  name: string;
}
```

```typescript
// src/index.ts
export * from './lib/interfaces/user.interface';
```

## 🧪 Testing Guidelines

- Write unit tests for all services and utilities
- Use Jest for testing framework
- Mock external dependencies
- Aim for high test coverage
- Test both happy path and error scenarios

Example test:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NewService } from './new-service';

describe('NewService', () => {
  let service: NewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NewService],
    }).compile();

    service = module.get<NewService>(NewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return hello message', () => {
    expect(service.doSomething()).toBe('Hello from shared service!');
  });
});
```

## 📋 Best Practices

1. **Keep it focused**: Only include truly shared functionality
2. **Follow NestJS patterns**: Use decorators, modules, and dependency injection
3. **Type everything**: Use TypeScript types and interfaces
4. **Document public APIs**: Add JSDoc comments for exported functions
5. **Test thoroughly**: Write comprehensive unit tests
6. **Version carefully**: Changes affect all consuming applications

## 🤝 Contributing

When contributing to this library:

1. Ensure changes are truly shared and reusable
2. Update exports in `index.ts`
3. Add appropriate tests
4. Update this README if needed
5. Follow the project's coding standards

## 📝 License

This library is part of the OrgTriply project and follows the same license terms.
