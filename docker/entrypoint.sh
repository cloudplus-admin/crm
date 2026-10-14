#!/bin/sh
# Перед стартом приложения применяем миграции.
set -e
alembic upgrade head
exec "$@"
