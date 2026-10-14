from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .models import PHONE_RE, LeadStatus, normalize_phone


class LeadCreate(BaseModel):
    name: str = Field(max_length=150)
    phone: str = Field(max_length=25)
    status: LeadStatus = LeadStatus.NEW

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Укажите имя.")
        return v

    @field_validator("phone")
    @classmethod
    def phone_format(cls, v: str) -> str:
        # Принимаем «+998 00 000-00-01» и приводим к +998000000001.
        v = normalize_phone(v)
        if not PHONE_RE.match(v):
            raise ValueError("Телефон в формате +998XXXXXXXXX (12 цифр после плюса).")
        return v


class LeadStatusUpdate(BaseModel):
    status: LeadStatus


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str
    status: LeadStatus
    created_at: datetime
    updated_at: datetime


class StatusOut(BaseModel):
    value: LeadStatus
    label: str
