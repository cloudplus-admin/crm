# CRM: демо страницы «Заявки»

Первое задание: страница «Заявки» с таблицей (Имя, Телефон, Статус), формой добавления,
фильтром по статусу и сменой статуса. Все имена и номера в демо вымышленные
(код `+998 00` не выдан ни одному оператору).

Стек: Python 3.12, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL 16, Jinja2, Docker Compose.

## Запуск в Docker (рекомендуется)

```bash
cd crm
cp .env.example .env               # и задайте свой POSTGRES_PASSWORD
docker compose up -d --build       # миграции применяются автоматически при старте app
docker compose exec app python -m app.seed   # 5 вымышленных заявок
```

Открыть http://127.0.0.1:8000/ (автодокументация API: http://127.0.0.1:8000/docs).
Остановить: `docker compose down` (с удалением данных БД: `docker compose down -v`).

Пароль в `.env` лучше задавать без символов `@ : / %`, иначе его нужно URL-кодировать в `DATABASE_URL`.

## Запуск без Docker

Нужен PostgreSQL (можно поднять только базу: `docker compose up -d db`).

```bash
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export DATABASE_URL="postgresql+psycopg://crm:ВАШ_ПАРОЛЬ@localhost:5432/crm"
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

## Что проверить

- **Добавление**: заполнить «Имя» и «Телефон» (можно с пробелами: `+998 00 000-00-77`), нажать «Добавить».
  Неверный номер показывает ошибку под полем.
- **Фильтр**: ссылки «Все / Новая / В работе / Успешно / Отказ» над таблицей.
- **Смена статуса**: выбрать статус в строке и нажать «Сохранить». Фильтр при этом сохраняется.

## Тесты

```bash
pip install -r requirements-dev.txt
pytest                                   # быстро, на SQLite в памяти
TEST_DATABASE_URL="postgresql+psycopg://crm:ВАШ_ПАРОЛЬ@localhost:5432/crm_test" pytest
```

`TEST_DATABASE_URL` должен указывать на отдельную тестовую базу: тесты пересоздают в ней таблицы.

## Миграции

```bash
alembic revision --autogenerate -m "описание"   # после изменения моделей; проверить файл руками
alembic upgrade head
alembic downgrade -1
```

## Структура

- `app/db.py` подключение к БД; адрес только из `DATABASE_URL`, в коде паролей нет.
- `app/models.py` модель `Lead`, статусы, нормализация телефона.
- `app/main.py` маршруты: `GET /` (список и фильтр), `POST /` (добавление),
  `POST /leads/{id}/status` (смена статуса). Формы защищены CSRF-токеном.
- `app/templates/leads.html` страница.
- `app/seed.py` демо-данные.
- `migrations/` миграции Alembic.
- `Dockerfile`, `docker-compose.yml`, `docker/entrypoint.sh` контейнеры (приложение работает не от root).
- `tests/` тесты на pytest.

## Лицензии зависимостей

| Зависимость | Лицензия | Примечание |
|---|---|---|
| fastapi | MIT | |
| uvicorn | BSD-3-Clause | |
| jinja2 | BSD-3-Clause | |
| sqlalchemy | MIT | |
| alembic | MIT | |
| python-multipart | Apache-2.0 | |
| psycopg (драйвер PostgreSQL) | LGPL-3.0 | Используется как есть, без изменений: раскрывать свой код не нужно. Если понадобится строго permissive, заменяется на `pg8000` (BSD-3) сменой `DATABASE_URL`. |
| PostgreSQL | PostgreSQL License | |
| pytest (dev) | MIT | |
| httpx (dev) | BSD-3-Clause | |
