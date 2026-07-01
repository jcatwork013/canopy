# Canopy — developer task runner
# Usage: make <target>

SHELL := /bin/bash
ENV_FILE := .env
API_DIR := apps/api
MIGRATIONS := $(API_DIR)/migrations
DB_URL ?= postgres://canopy:canopy@localhost:5432/canopy?sslmode=disable

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
.PHONY: setup
setup: ## Copy .env, generate encryption key, install JS deps
	@test -f $(ENV_FILE) || cp .env.example $(ENV_FILE)
	@echo "Generated CONFIG_ENCRYPTION_KEY (paste into .env):"
	@openssl rand -base64 32
	@pnpm install

.PHONY: genkey
genkey: ## Print a fresh base64 32-byte encryption key
	@openssl rand -base64 32

# ---------------------------------------------------------------------------
# Infra
# ---------------------------------------------------------------------------
.PHONY: up
up: ## Start postgres + minio + create bucket
	docker compose up -d postgres minio createbuckets

.PHONY: down
down: ## Stop the stack (keep volumes)
	docker compose down

.PHONY: nuke
nuke: ## Stop the stack and DELETE volumes (fresh DB)
	docker compose down -v

.PHONY: api
api: ## Run the Go API (in docker, hot reload)
	docker compose up api

.PHONY: logs
logs: ## Tail API logs
	docker compose logs -f api

# ---------------------------------------------------------------------------
# Database / migrations  (requires golang-migrate CLI)
# ---------------------------------------------------------------------------
.PHONY: migrate-up
migrate-up: ## Apply all migrations
	migrate -path $(MIGRATIONS) -database "$(DB_URL)" up

.PHONY: migrate-down
migrate-down: ## Roll back the last migration
	migrate -path $(MIGRATIONS) -database "$(DB_URL)" down 1

.PHONY: migrate-new
migrate-new: ## Create a new migration: make migrate-new name=add_x
	migrate create -ext sql -dir $(MIGRATIONS) -seq $(name)

.PHONY: sqlc
sqlc: ## Regenerate type-safe queries
	cd $(API_DIR) && sqlc generate

# ---------------------------------------------------------------------------
# Backend dev (local Go, no docker)
# ---------------------------------------------------------------------------
.PHONY: api-local
api-local: ## Run API locally (needs Go + infra up)
	cd $(API_DIR) && go run ./cmd/api

.PHONY: api-test
api-test: ## Run Go tests
	cd $(API_DIR) && go test ./...

.PHONY: api-tidy
api-tidy: ## go mod tidy
	cd $(API_DIR) && go mod tidy

# ---------------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------------
.PHONY: web
web: ## Run the web PWA dev server
	pnpm --filter @canopy/web dev

.PHONY: typecheck
typecheck: ## Typecheck all TS packages
	pnpm -r typecheck
