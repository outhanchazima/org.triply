# Triply Backend Documentation

Welcome to the **Triply Backend** technical documentation. This documentation covers the architecture, libraries, API reference, and developer guides for the OrgTriply backend monorepo.

## Table of Contents

### Architecture

- **[Architecture Overview](./architecture/overview.md)** — High-level system design, tech stack, and design principles
- **[Project Structure](./architecture/project-structure.md)** — Monorepo layout, apps, libs, and file conventions
- **[Dependency Graph](./architecture/dependency-graph.md)** — Inter-package dependency map and data flow

### Getting Started

- **[Installation](./getting-started/installation.md)** — Prerequisites, cloning, and running for the first time
- **[Configuration](./getting-started/configuration.md)** — Environment variables, app modes, and secrets management

### API Reference

- **[Triply API](./api/triply-api.md)** — REST endpoints, Swagger, versioning, and rate limiting

### Library Reference

- **[Database Library (`@org.triply/database`)](./libraries/database.md)** — PostgreSQL, MongoDB, Redis services, repositories, query filtering
- **[Shared Library (`@org.triply/shared`)](./libraries/shared.md)** — Config, HTTP client, decorators, filters, interceptors, pipes, utilities
- **[Amadeus Library (`@org.triply/amadeus`)](./libraries/amadeus.md)** — Amadeus API client for flights, hotels, and travel services
- **[Utils Library (`@org.triply/utils`)](./libraries/utils.md)** — Standalone utility module

### Guides

- **[Testing](./guides/testing.md)** — Unit tests, E2E tests, coverage, and best practices
- **[Contributing](./guides/contributing.md)** — Commit conventions, PR workflow, and code style
- **[Deployment](./guides/deployment.md)** — Building, CI/CD pipeline, and production checklist

---

> **Tip:** Use your IDE's Markdown preview or a tool like [Docsify](https://docsify.js.org/) to browse these docs as a site.
