# ============================================
# LunaStream - Makefile
# ============================================
# Convenience commands for development and deployment

.PHONY: help install dev build start clean test lint type-check db-push db-studio db-generate docker-build docker-run docker-compose electron-dev electron-build dist

help: ## Show this help
	@echo "LunaStream - Available Commands"
	@echo "================================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ============================================
# Development
# ============================================

install: ## Install dependencies
	npm install

dev: ## Start development server
	npm run dev

build: ## Build for production
	npm run build

start: ## Start production server
	npm start

clean: ## Clean build artifacts
	rm -rf .next dist out node_modules/.cache

# ============================================
# Quality
# ============================================

test: ## Run tests
	npm test

lint: ## Run ESLint
	npx next lint

type-check: ## Run TypeScript check
	npx tsc --noEmit

# ============================================
# Database
# ============================================

db-push: ## Push database schema
	npx prisma db push

db-studio: ## Open Prisma Studio
	npx prisma studio

db-generate: ## Generate Prisma Client
	npx prisma generate

db-reset: ## Reset database (WARNING: destroys data)
	npx prisma db push --force-reset

# ============================================
# Docker
# ============================================

docker-build: ## Build Docker image
	docker build -t lunastream .

docker-run: ## Run Docker container
	docker run -d -p 3000:3000 -e JWT_SECRET=dev-secret lunastream

docker-compose: ## Start with Docker Compose
	docker-compose up -d

docker-stop: ## Stop Docker Compose
	docker-compose down

# ============================================
# Desktop (Electron)
# ============================================

electron-dev: ## Start Electron in development
	npm run electron-dev

electron-build: ## Build Electron app
	npm run electron-build

dist: ## Build for all platforms
	npm run dist

dist-win: ## Build Windows installer
	npm run dist:win

dist-mac: ## Build macOS app
	npm run dist:mac

dist-linux: ## Build Linux packages
	npm run dist:linux

# ============================================
# Deployment
# ============================================

deploy-vercel: ## Deploy to Vercel
	npx vercel --prod

deploy-docker: ## Build and tag Docker image
	docker build -t lunastream:latest .
	docker tag lunastream:latest ghcr.io/lunastream/lunastream:latest
