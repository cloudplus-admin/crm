# Лицензии зависимостей

Правило: используем только permissive-лицензии (MIT, BSD, Apache-2.0, ISC, PostgreSQL и т. п.).
GPL и AGPL нельзя (в том числе Frappe CRM). LGPL допускается только для библиотек, которые
используются без изменений, с отметкой в таблице. Новая зависимость попадает сюда до мержа.

Как проверить:

```bash
pip install pip-licenses && pip-licenses --from=mixed      # Python (pip-licenses: MIT)
cd frontend && npx license-checker --summary               # npm, включая транзитивные (BSD-3)
```

## Python

| Зависимость | Лицензия | Где | Примечание |
|---|---|---|---|
| fastapi | MIT | runtime | |
| uvicorn | BSD-3-Clause | runtime | |
| sqlalchemy | MIT | runtime | |
| alembic | MIT | runtime | |
| psycopg (драйвер PostgreSQL) | LGPL-3.0 | runtime | Используется без изменений, свой код раскрывать не нужно. Строго permissive замена: `pg8000` (BSD-3), меняется только `DATABASE_URL`. |
| pydantic | MIT | runtime | через fastapi |
| pytest | MIT | dev | |
| httpx | BSD-3-Clause | dev | |
| ruff | MIT | dev | |

## Фронтенд (npm)

| Зависимость | Лицензия | Где |
|---|---|---|
| react, react-dom | MIT | runtime |
| vite, @vitejs/plugin-react | MIT | сборка |
| typescript | Apache-2.0 | сборка |
| @types/react, @types/react-dom | MIT | сборка |

Транзитивные npm-зависимости проверены `license-checker`: MIT, ISC, Apache-2.0, BSD-3-Clause и
CC-BY-4.0 (`caniuse-lite`, данные о браузерах, только при сборке). GPL/AGPL нет.

Шрифты и иконки: системные шрифты и встроенные SVG, сторонних пакетов нет.

## Сервисы и инфраструктура

| Компонент | Лицензия | Примечание |
|---|---|---|
| PostgreSQL | PostgreSQL License | |
| Docker Engine | Apache-2.0 | |

## Планируемые (проверить при добавлении)

| Кандидат | Ожидаемая лицензия | Зачем | Примечание |
|---|---|---|---|
| Celery, kombu | BSD-3-Clause | очередь задач | |
| Valkey | BSD-3-Clause | брокер очереди | Redis с версии 7.4 не BSD (RSAL/SSPL, позже добавлен AGPL), поэтому выбираем Valkey. |
| openpyxl | MIT | экспорт в Excel | |

## Запрещено

| Что | Лицензия | Почему |
|---|---|---|
| Frappe CRM, Frappe Framework | AGPL-3.0 / MIT (фреймворк) | Решение владельца: своё ядро, без кода Frappe. |
| Любые GPL/AGPL-библиотеки | GPL / AGPL | Обязательства по раскрытию исходников. |
