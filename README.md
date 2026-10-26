## Bookstore

[![Test](https://github.com/heerden/bookstore/actions/workflows/test.yml/badge.svg)](https://github.com/heerden/bookstore/actions/workflows/test.yml)

## Getting Started

Requires at least:

* NodeJS `24.22.0`

Run the command below to install the global package for the entire workspace:

```shell
npm install
npm i -g @nestjs/cli
npm install -g npm-check-updates
```

N.B. Never commit the .env file to the repo. Reproduce it from the template below.
`.development.env` is only included for demonstration purposes.

Only deploy the local PostgreSQL container:

```shell
npm run db:up
```

To reset the database (wipe volumes and re-create fresh container):
```shell
npm run db:reset
```

Execute and build the system from source:

Run in development watch mode (fast iteration):
```shell
npm run dev
```

Run in debug mode (attach inspector/breakpoints):
```shell
npm run dev:debug
```

Build the production source in dist folder:
```shell
npm run build
```

## System

* The **NestJS** backend framework (using Express) was chosen as it enforces strict design patterns and modular architecture.
* For future expansion, an npm workspaces monorepo was set up. The backend service is located in `packages/api`.
* Important packages:
  * `@nestjs/*` (Core, Common, Platform Express, Config, Passport)
  * `typeorm` & `@nestjs/typeorm` (PostgreSQL ORM)
  * `@nestjs/swagger` (OpenAPI documentation)
* Swagger OpenAPI Documentation is available at: `http://localhost:8080/docs`

## Running tests

```shell
npm run test
```

End-to-end tests

```shell
npm run db:up
```

```shell
npm run test:e2e
```

Test coverage
```shell
npm run test:cov
```

See the Github Action result for the latest test run results.

## Complete local deployment

```shell
docker build -t bookstore .
docker compose up
```
