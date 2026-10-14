# CRM: демо страницы «Заявки»

Первое задание: страница «Заявки» с таблицей (Имя, Телефон, Статус), формой добавления,
фильтром по статусу и сменой статуса. Все имена и номера в демо вымышленные
(код `+998 00` не выдан ни одному оператору).

Стек: бэкенд Python 3.12, FastAPI (JSON API), SQLAlchemy 2, Alembic, PostgreSQL 16;
фронтенд React 19 + TypeScript, сборка Vite; Docker Compose.

В Docker собирается один образ: React собирается в статику, и её раздаёт тот же FastAPI.

![Заявки на десктопе](docs/screenshots/desktop.png)

Страница адаптивная: на десктопе боковое меню и форма справа, на планшете форма открывается
окном, на телефоне строки становятся карточками, а форма выезжает снизу. Тёмная тема по настройке системы.
Скриншоты: [планшет](docs/screenshots/tablet.png), [телефон](docs/screenshots/mobile.png),
[форма на телефоне](docs/screenshots/mobile-form.png).

## Быстрый старт (make)

```bash
cd crm
make up       # создаст .env со случайным паролем БД, соберёт и запустит всё
make seed     # 5 вымышленных заявок
```

Открыть http://127.0.0.1:8000/ (документация API: http://127.0.0.1:8000/docs).
Все команды: `make help`.

| Команда | Что делает |
|---|---|
| `make up` / `make down` | запустить / остановить приложение и БД (данные сохраняются) |
| `make logs`, `make ps` | логи приложения, состояние контейнеров |
| `make migrate`, `make seed` | применить миграции, добавить демо-данные |
| `make psql` | консоль PostgreSQL |
| `make reset` | удалить контейнеры и данные БД (спросит подтверждение) |
| `make install` | локально: `.venv` с зависимостями Python и `npm ci` во `frontend/` |
| `make db` + `make dev-api` + `make dev-web` | разработка: БД в Docker, API на :8000, фронтенд на http://localhost:5173 |
| `make migration m="описание"` | новая миграция по изменениям моделей (проверьте файл руками) |
| `make test`, `make test-pg` | тесты API на SQLite / на PostgreSQL (база `crm_test`) |
| `make lint`, `make format` | ruff и проверка TypeScript / автоформатирование Python |

На Windows `make` проще всего запускать из WSL. Без `make` те же действия делаются командами ниже.

## Запуск в Docker без make

```bash
cp .env.example .env               # и задайте свой POSTGRES_PASSWORD
docker compose up -d --build       # миграции применяются автоматически при старте app
docker compose exec app python -m app.seed
```

Пароль в `.env` лучше задавать без символов `@ : / %`, иначе его нужно URL-кодировать в `DATABASE_URL`.

## Разработка без Docker и make

Нужны PostgreSQL (например, `docker compose up -d db`), Python 3.12+ и Node.js 20+.

```bash
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
export DATABASE_URL="postgresql+psycopg://crm:ВАШ_ПАРОЛЬ@localhost:5432/crm"
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload                        # API на :8000

cd frontend && npm ci && npm run dev                 # в другом терминале: http://localhost:5173
```

## Что проверить

- **Добавление**: заполнить «Имя» и «Телефон» (можно с пробелами: `+998 00 000-00-77`), нажать «Добавить».
  Неверный номер показывает ошибку под полем.
- **Фильтр**: вкладки «Все / Новая / В работе / Успешно / Отказ» над списком, с числом заявок.
- **Смена статуса**: выбрать новый статус в цветном списке в строке (на телефоне в карточке), он сохраняется сразу.
  Фильтр при этом сохраняется и хранится в адресе (`/?status=new`).

## API

| Метод | Путь | Что делает |
|---|---|---|
| GET | `/api/leads?status=new` | список заявок, фильтр необязателен |
| POST | `/api/leads` | создать: `{"name", "phone", "status"}` |
| PATCH | `/api/leads/{id}` | сменить статус: `{"status"}` |
| GET | `/api/statuses` | статусы с подписями и числом заявок в каждом |

Ошибки проверки приходят как `422 {"errors": {"phone": "..."}}`. Документация: http://127.0.0.1:8000/docs

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
- `app/schemas.py` схемы Pydantic и проверка имени и телефона.
- `app/main.py` JSON API и раздача собранного фронтенда.
- `frontend/` React-приложение: `src/LeadsPage.tsx` страница, `src/api.ts` клиент API.
- `app/seed.py` демо-данные.
- `migrations/` миграции Alembic.
- `Dockerfile`, `docker-compose.yml`, `docker/entrypoint.sh` контейнеры (приложение работает не от root).
- `Makefile` команды проекта (`make help`), `pyproject.toml` настройки ruff и pytest.
- `tests/` тесты на pytest.

## Документация

- [CLAUDE.md](CLAUDE.md): о проекте, решения, команды, правила, ближайшие шаги.
- [docs/architecture.md](docs/architecture.md): мультиарендность, доменная модель, коннекторы.
- [docs/integrations.md](docs/integrations.md): волны интеграций и что проверить по каждой.
- [docs/licenses.md](docs/licenses.md): лицензии всех зависимостей.
