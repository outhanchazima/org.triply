# OrgTriply Backend - Setup Guide

This comprehensive guide will help you set up the development environment for the OrgTriply backend monorepo.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.16.0 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js, or install latest: `npm install -g npm@latest`)
- **Git** ([Download](https://git-scm.com/))
- **VS Code** (recommended) or your preferred IDE

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be 18.16.0 or higher

# Check npm version
npm --version   # Should be 8.0.0 or higher

# Check Git version
git --version   # Should be 2.0.0 or higher
```

## 🚀 Quick Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd org.triply
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
npm install
```

This will install all dependencies for the monorepo including:

- Main application dependencies
- Shared library dependencies
- Development and testing tools

### 3. Verify Installation

```bash
# Check Nx installation
npx nx --version

# List all projects
npx nx show projects

# View project graph
npx nx graph
```

### 4. Start Development

```bash
# Start the main API application
npx nx serve triply.api
```

The API will be available at `http://localhost:3000`

## 🏗️ Project Structure Overview

```
org.triply/
├── apps/                     # Applications
│   ├── triply.api/          # Main NestJS API
│   └── triply.api-e2e/      # E2E tests
├── libs/                    # Shared libraries
│   ├── shared/              # Shared functionality
│   └── utils/               # Utility functions
├── .github/                 # CI/CD workflows
├── .husky/                  # Git hooks
├── .vscode/                 # VS Code configuration
└── [config files]          # Various configuration files
```

## 🛠️ Development Workflow

### Working with the Main Application

```bash
# Start development server
npx nx serve triply.api

# Build for production
npx nx build triply.api

# Run unit tests
npx nx test triply.api

# Run tests in watch mode
npx nx test triply.api --watch

# Run linting
npx nx lint triply.api

# Fix linting issues
npx nx lint triply.api --fix
```

### Working with Libraries

```bash
# Build shared library
npx nx build shared

# Test utils library
npx nx test utils

# Lint all libraries
npx nx run-many --target=lint --projects=shared,utils
```

### End-to-End Testing

```bash
# Run E2E tests
npx nx e2e triply.api-e2e

# Run E2E tests with specific configuration
npx nx e2e triply.api-e2e --configuration=production
```

### Code Quality & Standards

#### Linting

```bash
# Lint all projects
npx nx lint

# Lint with auto-fix
npx nx lint --fix

# Lint only changed files
npx nx affected --target=lint
```

#### Formatting

```bash
# Check code formatting
npx nx format:check

# Fix code formatting
npx nx format:write

# Format only changed files
npx nx format:write --uncommitted
```

#### Testing

```bash
# Run all tests
npx nx test

# Run only affected tests
npx nx affected --target=test

# Run tests with coverage
npx nx test --coverage

# Run tests in parallel
npx nx run-many --target=test --parallel=3
```

## 🔧 Git Workflow

### Conventional Commits

We use conventional commits for consistent commit messages:

```bash
# Use commitizen for guided commits
npm run commit

# Manual commit format examples:
git commit -m "feat: add new user authentication endpoint"
git commit -m "fix: resolve database connection timeout issue"
git commit -m "docs: update API documentation"
```

### Commit Types

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Pre-commit Hooks

Pre-commit hooks automatically run when you commit:

- **Lint-staged**: Runs linting and formatting on staged files
- **Commit message validation**: Ensures conventional commit format
- **Type checking**: Validates TypeScript types

If hooks fail, the commit will be rejected. Fix the issues and try again.

### Branch Strategy

1. **Create feature branch:**

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make changes and commit:**

   ```bash
   # Stage your changes
   git add .

   # Commit with conventional format
   npm run commit
   ```

3. **Push and create PR:**
   ```bash
   git push origin feat/your-feature-name
   ```

## 🧩 IDE Setup

### VS Code (Recommended)

#### Required Extensions

The following extensions are configured in `.vscode/extensions.json` and will be suggested when you open the project:

```json
{
  "recommendations": [
    "nrwl.angular-console", // Nx Console
    "ms-vscode.vscode-typescript-next", // TypeScript
    "dbaeumer.vscode-eslint", // ESLint
    "esbenp.prettier-vscode", // Prettier
    "orta.vscode-jest", // Jest testing
    "bradlc.vscode-tailwindcss", // Tailwind CSS
    "ms-vscode.vscode-json" // JSON support
  ]
}
```

#### VS Code Settings

The workspace settings are configured in `.vscode/settings.json`:

- Auto-format on save
- ESLint integration
- Jest test integration
- TypeScript strict mode

#### Using Nx Console

1. Install the **Nx Console** extension
2. Open the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Type "Nx: " to see available commands
4. Use the sidebar to run tasks and generate code

### IntelliJ IDEA / WebStorm

1. Install the **Nx Console** plugin
2. Enable TypeScript service
3. Configure ESLint and Prettier
4. Set up Jest test runner

## 🏭 Environment Configuration

### Development Environment

The development environment is configured with:

- **Hot reload** for rapid development
- **Source maps** for debugging
- **Detailed error messages**
- **Development-specific logging**

### Environment Variables

Create environment-specific configuration files:

```bash
# Development environment
apps/triply.api/src/environments/environment.ts

# Production environment
apps/triply.api/src/environments/environment.prod.ts
```

Example configuration:

```typescript
export const environment = {
  production: false,
  port: 3000,
  database: {
    host: 'localhost',
    port: 5432,
    // ... other config
  },
  jwt: {
    secret: 'development-secret',
    // ... other config
  },
};
```

## 📦 Package Management

### Dependency Management

```bash
# Add dependency to workspace
npm install <package-name>

# Add dev dependency
npm install -D <package-name>

# Add dependency to specific project
npm install <package-name> --workspace=apps/triply.api

# Update all dependencies
npm update

# Audit dependencies for security issues
npm audit
npm audit fix
```

### Library Dependencies

When working with libraries, ensure proper dependency management:

```bash
# Add dependency to library
cd libs/shared
npm install <package-name>

# Or use workspace commands
npm install <package-name> --workspace=libs/shared
```

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 <process-id>

# Or start on different port
npx nx serve triply.api --port=3001
```

#### Node Modules Issues

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Nx Cache Issues

```bash
# Clear Nx cache
npx nx reset

# Or manually remove cache
rm -rf .nx/cache
```

#### TypeScript Issues

```bash
# Check TypeScript compilation
npx nx typecheck triply.api

# Clear TypeScript cache
rm -rf apps/triply.api/dist
rm -rf libs/*/dist
```

### Getting Help

1. **Check existing issues**: Look for similar problems in the issue tracker
2. **Review logs**: Check console output for error details
3. **Verify setup**: Ensure all prerequisites are met
4. **Clean install**: Try removing `node_modules` and reinstalling
5. **Ask for help**: Create an issue with detailed information

## 📚 Additional Resources

### Documentation

- **[Project README](./README.md)** - Complete project overview
- **[Contributing Guide](./CONTRIBUTING.md)** - Contribution guidelines
- **[Changelog](./CHANGELOG.md)** - Version history

### External Resources

- **[Nx Documentation](https://nx.dev)** - Official Nx documentation
- **[NestJS Documentation](https://docs.nestjs.com)** - NestJS framework docs
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)** - TypeScript reference

### Community

- **[Nx Discord](https://go.nx.dev/community)** - Nx community support
- **[NestJS Discord](https://discord.gg/G7Qnnhy)** - NestJS community
- **[GitHub Discussions](https://github.com/your-repo/discussions)** - Project discussions

## ✅ Setup Verification Checklist

- [ ] Node.js 18.16.0+ installed
- [ ] npm latest version installed
- [ ] Git configured with your credentials
- [ ] Repository cloned successfully
- [ ] Dependencies installed without errors
- [ ] Main application starts (`npx nx serve triply.api`)
- [ ] Tests run successfully (`npx nx test`)
- [ ] Linting passes (`npx nx lint`)
- [ ] Project graph displays (`npx nx graph`)
- [ ] VS Code extensions installed (if using VS Code)
- [ ] Git hooks working (try `npm run commit`)

## 🎯 Next Steps

1. **Explore the codebase**: Start with `apps/triply.api/src/main.ts`
2. **Run the test suite**: `npx nx test`
3. **Check the project graph**: `npx nx graph`
4. **Read the contributing guide**: [CONTRIBUTING.md](./CONTRIBUTING.md)
5. **Join the community**: Check out our Discord or GitHub Discussions

---

Happy coding! 🚀
