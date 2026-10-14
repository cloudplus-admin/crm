import enum
import re
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class LeadStatus(str, enum.Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    WON = "won"
    LOST = "lost"

    @property
    def label(self) -> str:
        return STATUS_LABELS[self]


STATUS_LABELS = {
    LeadStatus.NEW: "Новая",
    LeadStatus.IN_PROGRESS: "В работе",
    LeadStatus.WON: "Успешно",
    LeadStatus.LOST: "Отказ",
}

PHONE_RE = re.compile(r"^\+998\d{9}$")


def normalize_phone(raw: str) -> str:
    """«+998 00 000-00-01» -> «+998000000001»."""
    digits = re.sub(r"\D", "", raw)
    return f"+{digits}" if digits else ""


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    phone: Mapped[str] = mapped_column(String(13), index=True)
    status: Mapped[LeadStatus] = mapped_column(
        # В БД храним значения ("new"), а не имена членов enum ("NEW").
        Enum(
            LeadStatus,
            native_enum=False,
            length=20,
            values_callable=lambda e: [m.value for m in e],
        ),
        default=LeadStatus.NEW,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )
