# ============================================
# Docker Management Makefile
# ============================================
# Quick commands for managing Docker containers

.PHONY: help build up down restart logs clean dev prod

# Default target
help:
	@echo "🐳 Docker Management Commands"
	@echo ""
	@echo "Production:"
	@echo "  make build     - Build all containers"
	@echo "  make up        - Start all containers"
	@echo "  make down      - Stop all containers"
	@echo "  make restart   - Restart all containers"
	@echo "  make logs      - View logs (all services)"
	@echo "  make clean     - Remove all containers, volumes, and images"
	@echo ""
	@echo "Development:"
	@echo "  make dev       - Start development environment"
	@echo "  make dev-down  - Stop development environment"
	@echo "  make dev-logs  - View development logs"
	@echo ""
	@echo "Database:"
	@echo "  make db-shell  - Access MySQL shell"
	@echo "  make db-backup - Backup database"
	@echo ""
	@echo "Individual Services:"
	@echo "  make logs-frontend  - View frontend logs"
	@echo "  make logs-backend   - View backend logs"
	@echo "  make logs-db        - View database logs"
	@echo "  make logs-nginx     - View nginx logs"

# ============================================
# Production Commands
# ============================================

build:
	@echo "🔨 Building all containers..."
	docker-compose build

up:
	@echo "🚀 Starting all containers..."
	docker-compose up -d
	@echo "✅ All services started!"
	@echo "   Application: http://localhost"
	@echo "   Frontend: http://localhost:3000"
	@echo "   Backend: http://localhost:5000"

down:
	@echo "🛑 Stopping all containers..."
	docker-compose down

restart:
	@echo "🔄 Restarting all containers..."
	docker-compose restart

logs:
	docker-compose logs -f

clean:
	@echo "🧹 Cleaning up all Docker resources..."
	docker-compose down -v --rmi all
	@echo "✅ Cleanup complete!"

# ============================================
# Development Commands
# ============================================

dev:
	@echo "🚀 Starting development environment..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo "✅ Development environment started!"
	@echo "   Frontend: http://localhost:3000"
	@echo "   Backend: http://localhost:5000"

dev-down:
	@echo "🛑 Stopping development environment..."
	docker-compose -f docker-compose.dev.yml down

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

# ============================================
# Individual Service Logs
# ============================================

logs-frontend:
	docker-compose logs -f frontend

logs-backend:
	docker-compose logs -f backend

logs-db:
	docker-compose logs -f db

logs-nginx:
	docker-compose logs -f nginx

# ============================================
# Database Commands
# ============================================

db-shell:
	@echo "🗄️  Accessing MySQL shell..."
	docker-compose exec db mysql -u user -ppassword123 social_media

db-backup:
	@echo "💾 Backing up database..."
	docker-compose exec db mysqldump -u user -ppassword123 social_media > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup complete!"

# ============================================
# Utility Commands
# ============================================

ps:
	docker-compose ps

stats:
	docker stats

rebuild:
	@echo "🔨 Rebuilding all containers..."
	docker-compose up -d --build
