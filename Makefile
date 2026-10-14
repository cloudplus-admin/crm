# Команды проекта. Список: make help
# Docker-цели нужны только Docker; локальные (install, dev-*, test, lint) — Python 3.12+ и Node.js 20+.

-include .env
POSTGRES_DB ?= crm
POSTGRES_USER ?= crm
export DATABASE_URL ?= postgresql+psycopg://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:5432/$(POSTGRES_DB)
TEST_DB ?= $(POSTGRES_DB)_test

VENV ?= .venv
PY := $(VENV)/bin/python
COMPOSE ?= docker compose

.DEFAULT_GOAL := help
.PHONY: help env up db down restart logs ps migrate seed psql reset \
        install dev-api dev-web build-web migration test test-pg lint format

help: ## Показать список команд
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

# ---------- Docker ----------

env: ## Создать .env со случайным паролем БД (если его ещё нет)
	@test -f .env && echo ".env уже есть" || { \
		sed "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$$(python3 -c 'import secrets; print(secrets.token_hex(16))')/" \
			.env.example > .env && echo "Создан .env"; }

up: env ## Собрать и запустить приложение и БД (http://127.0.0.1:8000)
	$(COMPOSE) up -d --build

db: env ## Запустить только PostgreSQL (для make dev-api)
	$(COMPOSE) up -d db

down: ## Остановить контейнеры (данные БД сохраняются)
	$(COMPOSE) down

restart: ## Перезапустить приложение
	$(COMPOSE) restart app

logs: ## Логи приложения
	$(COMPOSE) logs -f app

ps: ## Состояние контейнеров
	$(COMPOSE) ps

migrate: ## Применить миграции в контейнере
	$(COMPOSE) exec app alembic upgrade head

seed: ## Добавить вымышленные демо-заявки
	$(COMPOSE) exec app python -m app.seed

psql: ## Консоль PostgreSQL
	$(COMPOSE) exec db psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

reset: ## Удалить контейнеры И ДАННЫЕ БД (спросит подтверждение)
	@read -p "Удалить все данные БД? [y/N] " ans && [ "$$ans" = "y" ] && $(COMPOSE) down -v || echo "Отменено"

# ---------- Локальная разработка ----------

$(PY):
	python3 -m venv $(VENV)

install: $(PY) ## Установить зависимости Python и фронтенда
	$(PY) -m pip install -r requirements-dev.txt
	cd frontend && npm ci

dev-api: ## Запустить API с автоперезагрузкой на :8000 (сначала make db; контейнер app не должен работать)
	$(PY) -m alembic upgrade head
	$(PY) -m uvicorn app.main:app --reload

dev-web: ## Запустить фронтенд Vite с горячей перезагрузкой (http://localhost:5173)
	cd frontend && npm run dev

build-web: ## Собрать фронтенд в frontend/dist
	cd frontend && npm run build

migration: ## Создать миграцию по моделям: make migration m="описание"
	@test -n "$(m)" || { echo 'Укажите описание: make migration m="add contacts"'; exit 1; }
	$(PY) -m alembic revision --autogenerate -m "$(m)"

test: ## Тесты API (SQLite в памяти)
	$(PY) -m pytest

test-pg: ## Тесты API на PostgreSQL из docker compose (отдельная база crm_test)
	-@$(COMPOSE) exec -T db createdb -U $(POSTGRES_USER) $(TEST_DB) 2>/dev/null
	TEST_DATABASE_URL=postgresql+psycopg://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:5432/$(TEST_DB) \
		$(PY) -m pytest

lint: ## Проверить код: ruff и TypeScript
	$(PY) -m ruff check .
	$(PY) -m ruff format --check .
	cd frontend && npx tsc --noEmit

format: ## Отформатировать Python-код
	$(PY) -m ruff check --fix .
	$(PY) -m ruff format .
