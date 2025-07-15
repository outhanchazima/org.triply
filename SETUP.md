# Quick Setup Guide

This guide will help you set up the development environment for contributing to this project.

## Prerequisites

- Node.js 18.16.0 or higher
- npm (latest version)
- Git

## Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd org.triply
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run the application:**
   ```bash
   npx nx serve triply.api
   ```

## Development Workflow

### Making Commits

We use conventional commits. Use commitizen for guided commit messages:

```bash
npm run commit
```

This will prompt you through creating a properly formatted commit message.

### Running Tests

```bash
# Run all tests
npx nx test triply.api

# Run tests in watch mode
npx nx test triply.api --watch

# Run E2E tests
npx nx e2e triply.api-e2e
```

### Code Quality

```bash
# Run linting
npx nx lint triply.api

# Fix linting issues
npx nx lint triply.api --fix

# Check formatting
npx nx format:check

# Fix formatting
npx nx format:write
```

### Pre-commit Hooks

Pre-commit hooks are automatically set up via Husky and will:

- Run lint-staged on staged files
- Validate commit messages format
- Run formatting and linting checks

## Generating Changelog

To generate a changelog from conventional commits:

```bash
npm run changelog
```

## VS Code Extensions

Recommended extensions are configured in `.vscode/extensions.json`. VS Code should prompt you to install them when you open the project.

## Getting Help

- Check the [Contributing Guide](./CONTRIBUTING.md) for detailed information
- Review existing [Issues](https://github.com/your-repo/issues) and [Pull Requests](https://github.com/your-repo/pulls)
- Create a new issue if you need help

## Useful Commands

| Command                   | Description                  |
| ------------------------- | ---------------------------- |
| `npm run commit`          | Create a conventional commit |
| `npm run changelog`       | Generate changelog           |
| `npx nx serve triply.api` | Start development server     |
| `npx nx test triply.api`  | Run tests                    |
| `npx nx lint triply.api`  | Run linting                  |
| `npx nx build triply.api` | Build for production         |
