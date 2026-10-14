"""JSON API заявок и раздача собранного React-фронтенда."""

import os
from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_session
from .models import STATUS_LABELS, Lead, LeadStatus
from .schemas import LeadCreate, LeadOut, LeadStatusUpdate, StatusOut

# Схема БД создаётся миграциями: alembic upgrade head.
app = FastAPI(title="CRM")
api = APIRouter(prefix="/api")


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, exc: RequestValidationError):
    # Отдаём фронтенду ошибки по полям: {"errors": {"phone": "..."}}.
    errors: dict[str, str] = {}
    for err in exc.errors():
        field = str(err["loc"][-1]) if err["loc"] else "__all__"
        msg = err["msg"].removeprefix("Value error, ")
        if err["type"] == "enum":
            msg = "Неизвестный статус."
        errors.setdefault(field, msg)
    return JSONResponse(status_code=422, content={"errors": errors})


@api.get("/statuses", response_model=list[StatusOut])
def list_statuses():
    return [StatusOut(value=s, label=STATUS_LABELS[s]) for s in LeadStatus]


@api.get("/leads", response_model=list[LeadOut])
def list_leads(status: LeadStatus | None = None, session: Session = Depends(get_session)):
    query = select(Lead).order_by(Lead.created_at.desc(), Lead.id.desc())
    if status:
        query = query.where(Lead.status == status)
    return session.scalars(query).all()


@api.post("/leads", response_model=LeadOut, status_code=201)
def create_lead(data: LeadCreate, session: Session = Depends(get_session)):
    lead = Lead(name=data.name, phone=data.phone, status=data.status)
    session.add(lead)
    session.commit()
    return lead


@api.patch("/leads/{lead_id}", response_model=LeadOut)
def update_lead_status(
    lead_id: int, data: LeadStatusUpdate, session: Session = Depends(get_session)
):
    lead = session.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    lead.status = data.status
    session.commit()
    return lead


app.include_router(api)

# Собранный фронтенд (frontend/dist). В режиме разработки его раздаёт Vite.
FRONTEND_DIST = Path(
    os.environ.get("FRONTEND_DIST", Path(__file__).parent.parent / "frontend" / "dist")
)
if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
