# Contributing to Triply

Thank you for your interest in contributing to Triply! This guide will help you get started with contributing to our project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

By participating in this project, you are expected to uphold our code of conduct. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Node.js (version 22.16.0 or higher)
- npm (latest version)
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/triply.git
   ```
3. Navigate to the project directory:
   ```bash
   cd org.triply
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feat/your-feature-name
   ```

## Development Workflow

### Running the Application

```bash
# Start the development server
npx nx serve triply.api

# Run tests
npx nx test triply.api

# Run linting
npx nx lint triply.api

# Run e2e tests
npx nx e2e triply.api-e2e
```

### Available Commands

- `npm run commit` - Use commitizen for conventional commits
- `npm run lint:staged` - Run lint-staged on staged files
- `npm run changelog` - Generate changelog from conventional commits

## Commit Guidelines

We use [Conventional Commits](https://conventionalcommits.org/) for our commit messages. This leads to more readable messages that are easy to follow when looking through the project history.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to our CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Examples

```bash
feat(api): add user authentication endpoint
fix(database): resolve connection timeout issue
docs(readme): update installation instructions
test(api): add unit tests for user service
```

### Using Commitizen

We recommend using commitizen for consistent commit messages:

```bash
npm run commit
```

This will prompt you through the commit message creation process.

## Pull Request Process

1. **Create a feature branch** from `main`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Write or update tests** for your changes

4. **Run the test suite** to ensure nothing is broken:

   ```bash
   npx nx test triply.api
   npx nx lint triply.api
   npx nx e2e triply.api-e2e
   ```

5. **Commit your changes** using conventional commits:

   ```bash
   npm run commit
   ```

6. **Push to your fork** and create a pull request

7. **Fill out the pull request template** completely

8. **Wait for code review** and address any feedback

## Code Style

### TypeScript/JavaScript

- We use ESLint and Prettier for code formatting
- Follow the existing code style in the project
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### File Naming

- Use kebab-case for file names: `user-service.ts`
- Use PascalCase for class names: `UserService`
- Use camelCase for function and variable names: `getUserById`

### Project Structure

```
apps/
├── triply.api/           # Main API application
│   ├── src/
│   │   ├── app/          # Application modules
│   │   ├── main.ts       # Application entry point
│   └── ...
└── triply.api-e2e/       # E2E tests
```

## Testing

### Unit Tests

- Write unit tests for all new functionality
- Place test files next to the code they test: `user.service.spec.ts`
- Use descriptive test names that explain what is being tested
- Maintain high test coverage (aim for >80%)

### E2E Tests

- Write E2E tests for critical user flows
- E2E tests are located in `apps/triply.api-e2e/`

### Running Tests

```bash
# Run all tests
npx nx test triply.api

# Run tests in watch mode
npx nx test triply.api --watch

# Run E2E tests
npx nx e2e triply.api-e2e
```

## Issue Reporting

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check the documentation** for solutions
3. **Try the latest version** to see if the issue is already fixed

### Creating a Good Issue

1. **Use our issue templates** for bug reports and feature requests
2. **Provide clear reproduction steps** for bugs
3. **Include relevant environment information**
4. **Add screenshots or code examples** when helpful

## Getting Help

- **Documentation**: Check our project documentation
- **Issues**: Search existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions and ideas

## Recognition

Contributors who make significant contributions will be recognized in our:

- CHANGELOG.md
- Contributors section in README.md
- Release notes

Thank you for contributing to Triply! 🚀
