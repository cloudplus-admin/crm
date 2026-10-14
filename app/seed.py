"""Заполняет базу вымышленными заявками: python -m app.seed

Перед запуском примените миграции: alembic upgrade head.

Код «+998 00» не выдан ни одному оператору Узбекистана. Повторный запуск дублей не создаёт.
"""

from sqlalchemy import select

from .db import SessionLocal, get_engine
from .models import Lead, LeadStatus

DEMO_LEADS = [
    ("Тестовый Клиент Один", "+998000000001", LeadStatus.NEW),
    ("Демо Покупатель", "+998000000002", LeadStatus.IN_PROGRESS),
    ("Пример Заказчиков", "+998000000003", LeadStatus.WON),
    ("Вымышленная Компания", "+998000000004", LeadStatus.LOST),
    ("Образец Партнёров", "+998000000005", LeadStatus.NEW),
]


def main() -> None:
    get_engine()
    created = 0
    with SessionLocal() as session:
        for name, phone, status in DEMO_LEADS:
            if session.scalar(select(Lead).where(Lead.phone == phone)) is None:
                session.add(Lead(name=name, phone=phone, status=status))
                created += 1
        session.commit()
    print(f"Создано демо-заявок: {created}")


if __name__ == "__main__":
    main()
