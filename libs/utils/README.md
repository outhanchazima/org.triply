# @org.triply/utils

A utility library containing helper functions, constants, and common utilities for the OrgTriply backend monorepo.

## 📦 Overview

This library provides utility functions, constants, and helper classes that can be used across multiple applications and services within the OrgTriply ecosystem. It focuses on pure functions and stateless utilities.

## 🚀 Installation

This library is automatically available to all applications in the monorepo. To use it in your application:

```typescript
import { UtilsModule } from '@org.triply/utils';

@Module({
  imports: [UtilsModule],
  // ...
})
export class YourModule {}
```

Or import specific utilities:

```typescript
import { formatDate, generateId, validateEmail } from '@org.triply/utils';
```

## 📁 Structure

```
libs/utils/
├── src/
│   ├── index.ts              # Public API exports
│   └── lib/
│       ├── utils.module.ts   # Main NestJS module
│       ├── formatters/       # Data formatting utilities
│       ├── validators/       # Validation utilities
│       ├── generators/       # ID and code generators
│       ├── converters/       # Data conversion utilities
│       ├── constants/        # Application constants
│       ├── helpers/          # General helper functions
│       └── types/           # Utility type definitions
├── package.json             # Library configuration
├── tsconfig.lib.json        # TypeScript config
├── jest.config.ts          # Test configuration
└── README.md               # This file
```

## 🛠️ Development

### Building

```bash
# Build the library
npx nx build utils

# Build with dependencies
npx nx build utils --with-deps
```

### Testing

```bash
# Run unit tests
npx nx test utils

# Run tests in watch mode
npx nx test utils --watch

# Run tests with coverage
npx nx test utils --coverage
```

### Linting

```bash
# Lint the library
npx nx lint utils

# Auto-fix linting issues
npx nx lint utils --fix
```

## 📚 Usage Examples

### Date Formatting

```typescript
import { formatDate, formatDateTime } from '@org.triply/utils';

const date = new Date();
const formatted = formatDate(date, 'YYYY-MM-DD'); // "2025-07-28"
const dateTime = formatDateTime(date); // "2025-07-28 14:30:00"
```

### ID Generation

```typescript
import { generateUUID, generateULID, generateShortId } from '@org.triply/utils';

const uuid = generateUUID(); // "550e8400-e29b-41d4-a716-446655440000"
const ulid = generateULID(); // "01ARZ3NDEKTSV4RRFFQ69G5FAV"
const shortId = generateShortId(); // "A1B2C3D4"
```

### Validation

```typescript
import { validateEmail, validatePassword, isValidUUID } from '@org.triply/utils';

const isValidEmail = validateEmail('user@example.com'); // true
const isStrongPassword = validatePassword('SecureP@ss123'); // true
const isUUID = isValidUUID('550e8400-e29b-41d4-a716-446655440000'); // true
```

### Data Conversion

```typescript
import { toSnakeCase, toCamelCase, sanitizeString } from '@org.triply/utils';

const snake = toSnakeCase('firstName'); // "first_name"
const camel = toCamelCase('first_name'); // "firstName"
const clean = sanitizeString('<script>alert("xss")</script>'); // "alert(\"xss\")"
```

### Constants

```typescript
import { HTTP_STATUS_CODES, REGEX_PATTERNS, DATE_FORMATS, ERROR_MESSAGES } from '@org.triply/utils';

console.log(HTTP_STATUS_CODES.OK); // 200
console.log(REGEX_PATTERNS.EMAIL); // Email regex pattern
console.log(DATE_FORMATS.ISO); // "YYYY-MM-DDTHH:mm:ss.sssZ"
console.log(ERROR_MESSAGES.INVALID_INPUT); // "Invalid input provided"
```

## 🔧 Adding New Utilities

### Adding a Helper Function

1. Create the function in the appropriate category folder
2. Export it from `src/index.ts`
3. Add unit tests

```typescript
// src/lib/helpers/string-utils.ts
export function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}
```

```typescript
// src/index.ts
export * from './lib/helpers/string-utils';
```

### Adding Constants

```typescript
// src/lib/constants/api-constants.ts
export const API_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_TIMEOUT: 30000,
} as const;

export const API_ENDPOINTS = {
  USERS: '/api/users',
  AUTH: '/api/auth',
  HEALTH: '/api/health',
} as const;
```

### Adding Validators

```typescript
// src/lib/validators/custom-validators.ts
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

export function validatePostalCode(code: string, country: string): boolean {
  const patterns = {
    US: /^\d{5}(-\d{4})?$/,
    CA: /^[A-Z]\d[A-Z] \d[A-Z]\d$/,
    UK: /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/,
  };

  return patterns[country]?.test(code) ?? false;
}
```

## 🧪 Testing Guidelines

- Write unit tests for all utility functions
- Test edge cases and error conditions
- Use descriptive test names
- Mock external dependencies if any
- Aim for 100% test coverage for utilities

Example test:

```typescript
import { capitalizeFirstLetter, truncateString } from './string-utils';

describe('String Utils', () => {
  describe('capitalizeFirstLetter', () => {
    it('should capitalize the first letter', () => {
      expect(capitalizeFirstLetter('hello')).toBe('Hello');
    });

    it('should handle empty strings', () => {
      expect(capitalizeFirstLetter('')).toBe('');
    });

    it('should handle single characters', () => {
      expect(capitalizeFirstLetter('a')).toBe('A');
    });
  });

  describe('truncateString', () => {
    it('should truncate long strings', () => {
      expect(truncateString('Hello World!', 8)).toBe('Hello...');
    });

    it('should not truncate short strings', () => {
      expect(truncateString('Hello', 10)).toBe('Hello');
    });
  });
});
```

## 📋 Best Practices

1. **Pure functions**: Avoid side effects, return predictable results
2. **Type safety**: Use TypeScript types and generic functions where appropriate
3. **Performance**: Consider performance implications for frequently used utilities
4. **Documentation**: Add JSDoc comments for complex functions
5. **Consistency**: Follow consistent naming and structure patterns
6. **Error handling**: Handle edge cases gracefully

## 🤝 Contributing

When contributing to this library:

1. Ensure utilities are truly reusable and stateless
2. Add comprehensive tests
3. Update exports in `index.ts`
4. Document complex functions with JSDoc
5. Follow existing code patterns and conventions

## 📝 License

This library is part of the OrgTriply project and follows the same license terms.
