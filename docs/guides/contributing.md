# Contributing Guide

## Overview

This guide covers the development workflow, commit conventions, and PR process for contributing to Triply. For detailed setup instructions, see the [Installation Guide](../getting-started/installation.md).

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
```

**Branch naming conventions:**

| Prefix      | Use Case                 |
| ----------- | ------------------------ |
| `feat/`     | New features             |
| `fix/`      | Bug fixes                |
| `docs/`     | Documentation changes    |
| `refactor/` | Code refactoring         |
| `test/`     | Adding or updating tests |
| `chore/`    | Maintenance tasks        |

### 2. Make Changes

```bash
# Start dev server to verify changes
npx nx serve triply.api

# Run tests
npx nx test triply.api

# Run linting
npx nx lint triply.api
```

### 3. Commit

Use the interactive commitizen prompt:

```bash
npm run commit
```

Or write manual conventional commits:

```bash
git commit -m "feat(api): add hotel search endpoint"
```

### 4. Push and Create PR

```bash
git push origin feat/your-feature-name
```

Then open a Pull Request on GitHub using the PR template.

## Conventional Commits

All commits must follow the [Conventional Commits](https://conventionalcommits.org/) specification. This is enforced by `commitlint` via a Husky `commit-msg` hook.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `docs`     | Documentation only changes                              |
| `style`    | Code style changes (formatting, no logic change)        |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or updating tests                                |
| `build`    | Build system or external dependency changes             |
| `ci`       | CI configuration changes                                |
| `chore`    | Other changes that don't modify src or test files       |
| `revert`   | Reverts a previous commit                               |

### Scopes

| Scope      | Description          |
| ---------- | -------------------- |
| `api`      | Main API application |
| `database` | Database library     |
| `shared`   | Shared library       |
| `amadeus`  | Amadeus library      |
| `utils`    | Utils library        |
| `ui`       | Frontend (future)    |

### Examples

```bash
feat(api): add user authentication endpoint
fix(database): resolve connection timeout issue
docs(shared): add JSDoc to RequestService
test(api): add unit tests for flights service
refactor(amadeus): extract token management to separate method
chore: update dependencies
```

## Pre-Commit Hooks

Husky runs the following on every commit:

1. **`lint-staged`** — runs ESLint + Prettier on staged files only.
2. **`commitlint`** — validates commit message format.

If either check fails, the commit is **rejected**. Fix the issues and retry.

## Code Style

### General Rules

- **ESLint** + **Prettier** handle all formatting — don't fight the formatter.
- Use meaningful, descriptive variable and function names.
- Add JSDoc comments for all public APIs.
- Prefer `readonly` for injected dependencies.
- Use `private readonly` for class properties that shouldn't change.

### Naming Conventions

| Item         | Convention  | Example              |
| ------------ | ----------- | -------------------- |
| Files        | kebab-case  | `flights.service.ts` |
| Classes      | PascalCase  | `FlightsService`     |
| Functions    | camelCase   | `searchFlights()`    |
| Constants    | UPPER_SNAKE | `DEFAULT_TIMEOUT_MS` |
| Interfaces   | PascalCase  | `QueryOptions`       |
| Enums        | PascalCase  | `RequestContentType` |
| Enum members | UPPER_SNAKE | `FORM_URLENCODED`    |

### File Organisation

Every library exposes its public API through a barrel `index.ts` at `src/index.ts`. Internal files should not be imported directly by consumers.

## Pull Request Process

1. Fill out the PR template completely.
2. Ensure all CI checks pass (lint, test, build, typecheck).
3. Request review from at least one maintainer.
4. Address all review feedback.
5. Squash-merge into `main`.

## Next Steps

- [Testing Guide →](./testing.md)
- [Deployment Guide →](./deployment.md)
