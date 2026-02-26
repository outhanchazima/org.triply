# Installation

## Prerequisites

| Requirement | Minimum Version | Check Command    |
| ----------- | --------------- | ---------------- |
| **Node.js** | 22.16.0         | `node --version` |
| **npm**     | 10+             | `npm --version`  |
| **Git**     | 2.0+            | `git --version`  |

> **Recommended:** Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to manage Node.js versions.

## Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd org.triply

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env
# Edit .env with your actual values (see Configuration guide)

# 4. Start the development server
npx nx serve triply.api
```

The API will be available at **http://localhost:3000/api/v1**.

Swagger docs (when in sandbox mode): **http://localhost:3000/api/docs**.

## What `npm install` Does

1. Installs all root `dependencies` and `devDependencies` from `package.json`.
2. Resolves workspace packages defined in `apps/*` and `libs/*`.
3. Sets up Husky git hooks (pre-commit linting, commit message validation).
4. Links internal library packages (`@org.triply/shared`, `@org.triply/amadeus`, etc.).

## Verify Installation

```bash
# Check Nx is available
npx nx --version

# List all workspace projects
npx nx show projects

# Visualise dependency graph (opens browser)
npx nx graph
```

Expected projects:

| Project          | Type        |
| ---------------- | ----------- |
| `triply.api`     | Application |
| `triply.api-e2e` | E2E tests   |
| `shared`         | Library     |
| `database`       | Library     |
| `amadeus`        | Library     |
| `utils`          | Library     |

## Common npm Scripts

| Script                | Description                                   |
| --------------------- | --------------------------------------------- |
| `npm start`           | Start API dev server                          |
| `npm run start:dev`   | Start with file watching                      |
| `npm run start:debug` | Start with Node.js inspector                  |
| `npm run build`       | Production build                              |
| `npm test`            | Run unit tests                                |
| `npm run test:e2e`    | Run E2E tests                                 |
| `npm run lint`        | Lint the API project                          |
| `npm run format`      | Auto-format all files                         |
| `npm run commit`      | Interactive conventional commit               |
| `npm run graph`       | Open Nx dependency graph                      |
| `npm run dev:fresh`   | Clean install (removes caches + node_modules) |

## Troubleshooting

### Port 3000 already in use

```bash
lsof -ti:3000 | xargs kill -9
# Or start on a different port:
PORT=3001 npx nx serve triply.api
```

### Stale Nx cache

```bash
npx nx reset
```

### Node modules corruption

```bash
npm run dev:fresh
```

### TypeScript build errors in libs

```bash
npx nx run-many -t typecheck
```

## Next Steps

- [Configuration →](./configuration.md)
- [Architecture Overview →](../architecture/overview.md)
