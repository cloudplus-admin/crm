"""Страница «Заявки»: таблица, добавление, фильтр по статусу, смена статуса."""
import hmac
import secrets
from pathlib import Path
from urllib.parse import quote, unquote, urlencode

from fastapi import Depends, FastAPI, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_session
from .models import PHONE_RE, Lead, LeadStatus, normalize_phone

CSRF_COOKIE = "csrftoken"
FLASH_COOKIE = "flash"

templates = Jinja2Templates(directory=Path(__file__).parent / "templates")


# Схема БД создаётся миграциями: alembic upgrade head.
app = FastAPI(title="CRM")


def _parse_status(value: str | None) -> LeadStatus | None:
    try:
        return LeadStatus(value) if value else None
    except ValueError:
        return None


def _list_url(status: LeadStatus | None) -> str:
    return "/?" + urlencode({"status": status.value}) if status else "/"


def _check_csrf(request: Request, token: str) -> None:
    # Double-submit: токен из скрытого поля формы должен совпасть с cookie.
    cookie = request.cookies.get(CSRF_COOKIE, "")
    if not cookie or not hmac.compare_digest(cookie, token):
        raise HTTPException(status_code=403, detail="CSRF token mismatch")


def _redirect(url: str, flash: str) -> RedirectResponse:
    resp = RedirectResponse(url, status_code=303)
    # Cookie допускает только latin-1, поэтому кириллицу кодируем.
    resp.set_cookie(FLASH_COOKIE, quote(flash), max_age=30, httponly=True, samesite="lax")
    return resp


def _render(request, session, current_status, form=None, errors=None, status_code=200):
    query = select(Lead).order_by(Lead.created_at.desc(), Lead.id.desc())
    if current_status:
        query = query.where(Lead.status == current_status)

    csrf = request.cookies.get(CSRF_COOKIE) or secrets.token_urlsafe(32)
    resp = templates.TemplateResponse(
        request,
        "leads.html",
        {
            "leads": session.scalars(query).all(),
            "statuses": list(LeadStatus),
            "current_status": current_status,
            "form": form or {"name": "", "phone": "", "status": LeadStatus.NEW.value},
            "errors": errors or {},
            "flash": unquote(request.cookies.get(FLASH_COOKIE, "")),
            "csrf_token": csrf,
        },
        status_code=status_code,
    )
    resp.set_cookie(CSRF_COOKIE, csrf, httponly=True, samesite="lax")
    resp.delete_cookie(FLASH_COOKIE)
    return resp


@app.get("/", response_class=HTMLResponse)
def lead_list(request: Request, status: str | None = None, session: Session = Depends(get_session)):
    return _render(request, session, _parse_status(status))


@app.post("/", response_class=HTMLResponse)
def lead_create(
    request: Request,
    status_filter: str | None = None,
    name: str = Form(""),
    phone: str = Form(""),
    status: str = Form(LeadStatus.NEW.value),
    csrf_token: str = Form(""),
    session: Session = Depends(get_session),
):
    _check_csrf(request, csrf_token)
    current = _parse_status(status_filter)

    name = name.strip()
    phone_norm = normalize_phone(phone)
    lead_status = _parse_status(status)
    errors = {}
    if not name:
        errors["name"] = "Укажите имя."
    elif len(name) > 150:
        errors["name"] = "Не длиннее 150 символов."
    if not PHONE_RE.match(phone_norm):
        errors["phone"] = "Телефон в формате +998XXXXXXXXX (12 цифр после плюса)."
    if lead_status is None:
        errors["status"] = "Неизвестный статус."

    if errors:
        form = {"name": name, "phone": phone, "status": status}
        return _render(request, session, current, form, errors, status_code=422)

    lead = Lead(name=name, phone=phone_norm, status=lead_status)
    session.add(lead)
    session.commit()
    return _redirect(_list_url(current), f"Заявка «{name}» добавлена.")


@app.post("/leads/{lead_id}/status")
def lead_set_status(
    request: Request,
    lead_id: int,
    status: str = Form(...),
    return_status: str = Form(""),
    csrf_token: str = Form(""),
    session: Session = Depends(get_session),
):
    _check_csrf(request, csrf_token)
    lead = session.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    back = _list_url(_parse_status(return_status))
    new_status = _parse_status(status)
    if new_status is None:
        return _redirect(back, "Ошибка: неизвестный статус.")

    lead.status = new_status
    session.commit()
    return _redirect(back, f"Статус заявки «{lead.name}»: {new_status.label}.")
