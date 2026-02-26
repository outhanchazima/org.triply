# Utils Library (`@org.triply/utils`)

## Overview

Standalone utility module intended as a container for generic, framework-agnostic utilities that don't depend on any other internal library.

**Import:** `@org.triply/utils`

**Status:** Placeholder — currently contains an empty NestJS module. As the project grows, utilities that are not NestJS-specific and don't belong in `@org.triply/shared` should be placed here.

## Module

```typescript
import { UtilsModule } from '@org.triply/utils';

@Module({
  imports: [UtilsModule],
})
export class AppModule {}
```

## When to Use `utils` vs `shared`

| Criteria                         | `@org.triply/utils` | `@org.triply/shared`         |
| -------------------------------- | ------------------- | ---------------------------- |
| **NestJS dependency**            | No                  | Yes                          |
| **Injectable services**          | No                  | Yes (`RequestService`, etc.) |
| **Decorators / Pipes / Filters** | No                  | Yes                          |
| **Pure functions**               | Yes                 | Yes (in `utils/` subfolder)  |
| **Used by libs without NestJS**  | Yes                 | Possible but heavier         |

## Next Steps

- [Shared Library →](./shared.md)
- [Database Library →](./database.md)
