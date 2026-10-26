.PHONY: help db-up db-down db-reset db-logs dev dev-debug build test test-watch test-e2e compose-up compose-down

help:
	@echo "Available commands:"
	@echo "  make db-up        Start PostgreSQL container in background"
	@echo "  make db-down      Stop PostgreSQL container"
	@echo "  make db-reset     Wipe database volume and restart fresh container"
	@echo "  make db-logs      Follow PostgreSQL container logs"
	@echo "  make dev          Start NestJS API in watch mode"
	@echo "  make dev-debug    Start NestJS API in debug watch mode"
	@echo "  make build        Build API package"
	@echo "  make test         Run unit tests"
	@echo "  make test-watch   Run unit tests in watch mode"
	@echo "  make test-e2e     Run E2E tests against PostgreSQL"
	@echo "  make compose-up   Build and start entire stack in Docker"
	@echo "  make compose-down Stop entire Docker Compose stack"

db-up:
	docker compose up -d db

db-down:
	docker compose down

db-reset:
	docker compose down -v && docker compose up -d db

db-logs:
	docker compose logs -f db

dev:
	npm run dev:watch --workspace=packages/api

dev-debug:
	npm run dev:debug --workspace=packages/api

build:
	npm run build --workspace=packages/api

test:
	npm run test --workspace=packages/api

test-watch:
	npm run test:watch --workspace=packages/api

test-e2e:
	npm run test:e2e --workspace=packages/api

compose-up:
	docker compose up --build

compose-down:
	docker compose down
