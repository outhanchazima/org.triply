# OrgTriply Backend

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

A modern, scalable backend monorepo built with **NestJS**, **Nx**, and **TypeScript**. This workspace provides a robust foundation for building microservices and shared libraries with enterprise-grade tooling and best practices.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npx nx serve triply.api

# View project graph
npx nx graph
```

## 📁 Project Structure

```
org.triply/
├── apps/                          # Applications
│   ├── triply.api/               # Main NestJS API application
│   │   ├── src/
│   │   │   ├── app/              # Application logic
│   │   │   │   ├── app.controller.ts
│   │   │   │   ├── app.service.ts
│   │   │   │   └── app.module.ts
│   │   │   ├── main.ts           # Application entry point
│   │   │   └── assets/           # Static assets
│   │   ├── webpack.config.js     # Webpack configuration
│   │   ├── tsconfig.app.json     # TypeScript config for app
│   │   └── jest.config.ts        # Jest test configuration
│   └── triply.api-e2e/          # End-to-end tests
│       ├── src/
│       │   ├── support/          # Test utilities
│       │   └── triply.api/       # E2E test specs
│       └── jest.config.ts
├── libs/                         # Shared libraries
│   ├── shared/                   # Shared functionality library
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   └── shared.module.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.lib.json
│   │   └── jest.config.ts
│   └── utils/                    # Utility library
│       ├── src/
│       │   ├── lib/
│       │   │   └── utils.module.ts
│       │   └── index.ts
│       ├── package.json
│       ├── tsconfig.lib.json
│       └── jest.config.ts
├── .github/                      # GitHub workflows and templates
├── .husky/                       # Git hooks
├── .vscode/                      # VS Code settings
├── nx.json                       # Nx workspace configuration
├── package.json                  # Root package.json
├── tsconfig.base.json           # Base TypeScript configuration
├── eslint.config.mjs            # ESLint configuration
└── jest.config.ts               # Jest workspace configuration
```

## 🛠️ Technology Stack

### Core Technologies

- **[NestJS](https://nestjs.com/)** - Progressive Node.js framework for building scalable applications
- **[Nx](https://nx.dev/)** - Smart, fast and extensible build system with first class monorepo support
- **[TypeScript](https://www.typescriptlang.org/)** - Typed superset of JavaScript
- **[Node.js](https://nodejs.org/)** - JavaScript runtime environment

### Database & Storage

- **[TypeORM](https://typeorm.io/)** - ORM for TypeScript and JavaScript
- **[Mongoose](https://mongoosejs.com/)** - MongoDB object modeling for Node.js
- **[PostgreSQL](https://www.postgresql.org/)** - Advanced open source relational database

### Authentication & Security

- **[Passport.js](http://www.passportjs.org/)** - Authentication middleware for Node.js
- **[JWT](https://jwt.io/)** - JSON Web Tokens for secure authentication
- **[bcrypt](https://github.com/kelektiv/node.bcrypt.js)** - Password hashing library
- **[Helmet](https://helmetjs.github.io/)** - Security middleware for Express apps

### API & Documentation

- **[Swagger/OpenAPI](https://swagger.io/)** - API documentation and testing
- **[Axios](https://axios-http.com/)** - Promise-based HTTP client
- **[class-validator](https://github.com/typestack/class-validator)** - Decorator-based validation
- **[class-transformer](https://github.com/typestack/class-transformer)** - Object transformation

### Background Processing

- **[Bull](https://github.com/OptimalBits/bull)** - Premium Queue package for handling distributed jobs
- **[Cache Manager](https://github.com/node-cache-manager/node-cache-manager)** - Multi-store caching solution

### Development Tools

- **[ESLint](https://eslint.org/)** - Linting utility for JavaScript and TypeScript
- **[Prettier](https://prettier.io/)** - Code formatter
- **[Jest](https://jestjs.io/)** - JavaScript testing framework
- **[Husky](https://typicode.github.io/husky/)** - Git hooks for quality gates
- **[Commitizen](https://github.com/commitizen/cz-cli)** - Conventional commit formatting

## 🏗️ Architecture

This monorepo follows a modular architecture with clear separation of concerns:

- **Applications (`apps/`)**: Deployable applications and services
- **Libraries (`libs/`)**: Shared code and reusable modules
- **Workspace-level tooling**: Shared configuration for linting, testing, and building

### Dependency Graph

```
triply.api (app)
├── @org.triply/shared (lib)
├── @org.triply/utils (lib)
└── triply.api-e2e (e2e tests)
```

## 🚀 Development

### Prerequisites

- **Node.js** 22.16.0 or higher
- **npm** (latest version)
- **Git**

### Quick Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd org.triply
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start development server:**

   ```bash
   npx nx serve triply.api
   ```

4. **View project graph:**
   ```bash
   npx nx graph
   ```

### Available Commands

#### Application Commands

| Command                     | Description              |
| --------------------------- | ------------------------ |
| `npx nx serve triply.api`   | Start development server |
| `npx nx build triply.api`   | Build for production     |
| `npx nx test triply.api`    | Run unit tests           |
| `npx nx lint triply.api`    | Run linting              |
| `npx nx e2e triply.api-e2e` | Run end-to-end tests     |

#### Library Commands

| Command               | Description          |
| --------------------- | -------------------- |
| `npx nx build shared` | Build shared library |
| `npx nx test shared`  | Test shared library  |
| `npx nx lint shared`  | Lint shared library  |
| `npx nx build utils`  | Build utils library  |
| `npx nx test utils`   | Test utils library   |
| `npx nx lint utils`   | Lint utils library   |

#### Workspace Commands

| Command                | Description                |
| ---------------------- | -------------------------- |
| `npx nx graph`         | View dependency graph      |
| `npx nx show projects` | List all projects          |
| `npx nx format:check`  | Check code formatting      |
| `npx nx format:write`  | Fix code formatting        |
| `npm run commit`       | Create conventional commit |
| `npm run changelog`    | Generate changelog         |

## 📦 Working with Libraries

### Creating New Libraries

Generate a new NestJS library in the libs folder:

```bash
# General purpose library
npx nx generate @nx/nest:library --name=<library-name> --directory=libs/<library-name> --linter=eslint --unitTestRunner=jest --buildable=true

# Examples:
npx nx generate @nx/nest:library --name=auth --directory=libs/auth --linter=eslint --unitTestRunner=jest --buildable=true
npx nx generate @nx/nest:library --name=database --directory=libs/database --linter=eslint --unitTestRunner=jest --buildable=true
npx nx generate @nx/nest:library --name=common --directory=libs/common --linter=eslint --unitTestRunner=jest --buildable=true
```

### Using Libraries in Applications

Import shared libraries in your applications:

```typescript
// In your app module
import { SharedModule } from '@org.triply/shared';
import { UtilsModule } from '@org.triply/utils';

@Module({
  imports: [SharedModule, UtilsModule],
  // ...
})
export class AppModule {}
```

### Library Structure

Each library follows this structure:

```
libs/<library-name>/
├── src/
│   ├── index.ts              # Public API exports
│   └── lib/
│       ├── <library-name>.module.ts  # NestJS module
│       ├── services/         # Business logic
│       ├── controllers/      # HTTP controllers (if needed)
│       ├── interfaces/       # TypeScript interfaces
│       └── types/           # Type definitions
├── package.json             # Library package config
├── tsconfig.lib.json        # TypeScript config for library
├── tsconfig.spec.json       # TypeScript config for tests
├── jest.config.ts          # Jest test configuration
├── eslint.config.mjs       # ESLint configuration
└── README.md               # Library documentation
```

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
npx nx test

# Run tests for specific project
npx nx test triply.api
npx nx test shared
npx nx test utils

# Run tests in watch mode
npx nx test triply.api --watch

# Run tests with coverage
npx nx test triply.api --coverage
```

### End-to-End Tests

```bash
# Run E2E tests
npx nx e2e triply.api-e2e

# Run E2E tests with specific configuration
npx nx e2e triply.api-e2e --configuration=production
```

### Test Configuration

- **Jest** is configured at the workspace level in `jest.config.ts`
- Individual projects have their own `jest.config.ts` files
- Test files should be placed alongside source files with `.spec.ts` extension
- E2E tests are in separate projects with `.e2e-spec.ts` extension

## 🔧 Code Quality & Standards

### Linting

ESLint is configured with TypeScript support and Prettier integration:

```bash
# Lint all projects
npx nx lint

# Lint specific project
npx nx lint triply.api

# Auto-fix linting issues
npx nx lint triply.api --fix
```

### Formatting

Prettier is configured for consistent code formatting:

```bash
# Check formatting
npx nx format:check

# Fix formatting
npx nx format:write

# Format specific files
npx nx format:write --files="apps/triply.api/src/**/*.ts"
```

### Git Hooks

Husky is configured with pre-commit hooks that:

- Run `lint-staged` on staged files
- Validate commit message format (conventional commits)
- Run formatting and linting checks

### Conventional Commits

Use commitizen for guided commit creation:

```bash
npm run commit
```

This ensures commits follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## 🚢 Deployment

### Building for Production

```bash
# Build main application
npx nx build triply.api

# Build all libraries
npx nx build shared
npx nx build utils

# Build everything
npx nx run-many --target=build
```

### Environment Configuration

Configuration is handled through NestJS Config module with environment-specific files:

- `apps/triply.api/src/environments/`
  - `environment.ts` - Development environment
  - `environment.prod.ts` - Production environment

### Docker Support

Docker configuration can be added using Nx Docker plugin:

```bash
npx nx generate @nx/node:setup-docker --project=triply.api
```

## 🏃‍♂️ CI/CD

### Nx Cloud

This workspace is connected to Nx Cloud for:

- **Remote Caching**: Share build artifacts across team and CI
- **Distributed Task Execution**: Run tasks across multiple machines
- **Build Insights**: Monitor build performance and trends

### GitHub Actions

CI/CD workflows are configured in `.github/workflows/`:

- **Continuous Integration**: Run tests, linting, and builds on PRs
- **Dependency Updates**: Automated dependency updates
- **Release Management**: Automated releases with conventional commits

### Available Nx Cloud Features

```bash
# Connect to Nx Cloud (already configured)
npx nx connect-to-nx-cloud

# View build history
npx nx show project triply.api

# Run with distributed execution
npx nx affected --target=test --parallel=3
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Clone your fork and install dependencies:**
   ```bash
   git clone <your-fork-url>
   cd org.triply
   npm install
   ```
3. **Create a feature branch:**
   ```bash
   git checkout -b feat/your-feature-name
   ```
4. **Make your changes and test:**
   ```bash
   npx nx test affected
   npx nx lint affected
   ```
5. **Commit using conventional commits:**
   ```bash
   npm run commit
   ```
6. **Push and create a pull request**

### Development Guidelines

- Follow the existing code style and conventions
- Write unit tests for new functionality
- Update documentation as needed
- Use conventional commit messages
- Ensure all CI checks pass

For detailed contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📚 Documentation

- **[Setup Guide](./SETUP.md)** - Detailed setup instructions
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute to the project
- **[Changelog](./CHANGELOG.md)** - Project changelog
- **[Nx Documentation](https://nx.dev)** - Official Nx documentation
- **[NestJS Documentation](https://docs.nestjs.com)** - Official NestJS documentation

## 🛠️ IDE Setup

### VS Code Extensions

Recommended extensions (configured in `.vscode/extensions.json`):

- **Nx Console** - Nx workspace management
- **TypeScript Hero** - TypeScript tooling
- **ESLint** - Linting support
- **Prettier** - Code formatting
- **Jest** - Test runner integration
- **Auto Rename Tag** - HTML/XML tag renaming
- **GitLens** - Git supercharged

### IntelliJ/WebStorm

Install the **Nx Console** plugin for full Nx integration.

## 📊 Package Information

### Dependencies Overview

| Category           | Key Packages                                                 |
| ------------------ | ------------------------------------------------------------ |
| **Framework**      | `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` |
| **Database**       | `@nestjs/typeorm`, `@nestjs/mongoose`, `typeorm`, `mongoose` |
| **Authentication** | `@nestjs/passport`, `@nestjs/jwt`, `passport`, `bcrypt`      |
| **Validation**     | `class-validator`, `class-transformer`                       |
| **Testing**        | `jest`, `@nestjs/testing`                                    |
| **Development**    | `@nx/nest`, `@nx/js`, `typescript`, `eslint`                 |

### Scripts

| Script                | Description                                |
| --------------------- | ------------------------------------------ |
| `npm run commit`      | Create conventional commit with commitizen |
| `npm run changelog`   | Generate changelog from commits            |
| `npm run lint:staged` | Run lint-staged on staged files            |

## 🚀 Getting Started Checklist

- [ ] Clone the repository
- [ ] Install dependencies with `npm install`
- [ ] Start development server with `npx nx serve triply.api`
- [ ] Explore the project structure
- [ ] Run tests with `npx nx test`
- [ ] View dependency graph with `npx nx graph`
- [ ] Read the [Contributing Guidelines](./CONTRIBUTING.md)
- [ ] Set up your IDE with recommended extensions

## 🔗 Useful Links

### Project Resources

- **[Nx Workspace](https://nx.dev)** - Smart, fast and extensible build system
- **[NestJS](https://nestjs.com)** - A progressive Node.js framework
- **[TypeScript](https://www.typescriptlang.org)** - Typed superset of JavaScript

### Community & Support

- **[Nx Discord](https://go.nx.dev/community)** - Join the Nx community
- **[NestJS Discord](https://discord.gg/G7Qnnhy)** - NestJS community support
- **[GitHub Issues](https://github.com/your-repo/issues)** - Report bugs and request features
- **[GitHub Discussions](https://github.com/your-repo/discussions)** - Ask questions and share ideas

---

**Built with ❤️ using [Nx](https://nx.dev) and [NestJS](https://nestjs.com)**
