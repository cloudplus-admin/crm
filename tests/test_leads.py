from sqlalchemy import select

from app.models import Lead, LeadStatus


def _lead(factory, name):
    with factory() as s:
        return s.scalar(select(Lead).where(Lead.name == name))


def test_list_leads(client):
    data = client.get("/api/leads").json()
    assert {d["name"] for d in data} == {"Тест Новый", "Тест Успешный"}
    assert set(data[0]) >= {"id", "name", "phone", "status"}


def test_statuses(client):
    data = client.get("/api/statuses").json()
    assert [s["value"] for s in data] == ["new", "in_progress", "won", "lost"]
    assert data[0]["label"] == "Новая"


def test_add_lead(client, session_factory):
    resp = client.post(
        "/api/leads", json={"name": " Тест Добавленный ", "phone": "+998 00 000-00-13"}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Тест Добавленный"
    assert body["phone"] == "+998000000013"
    assert body["status"] == "new"
    assert _lead(session_factory, "Тест Добавленный") is not None


def test_add_lead_invalid(client, session_factory):
    resp = client.post("/api/leads", json={"name": "  ", "phone": "12345"})
    assert resp.status_code == 422
    errors = resp.json()["errors"]
    assert errors["phone"].startswith("Телефон в формате")
    assert errors["name"] == "Укажите имя."
    assert _lead(session_factory, "  ") is None


def test_filter_by_status(client):
    data = client.get("/api/leads", params={"status": "won"}).json()
    assert [d["name"] for d in data] == ["Тест Успешный"]


def test_unknown_filter_rejected(client):
    resp = client.get("/api/leads", params={"status": "nope"})
    assert resp.status_code == 422
    assert resp.json()["errors"]["status"] == "Неизвестный статус."


def test_change_status(client, session_factory):
    lead = _lead(session_factory, "Тест Новый")
    resp = client.patch(f"/api/leads/{lead.id}", json={"status": "in_progress"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"
    assert _lead(session_factory, "Тест Новый").status == LeadStatus.IN_PROGRESS


def test_change_status_rejects_unknown_value(client, session_factory):
    lead = _lead(session_factory, "Тест Новый")
    resp = client.patch(f"/api/leads/{lead.id}", json={"status": "hacked"})
    assert resp.status_code == 422
    assert _lead(session_factory, "Тест Новый").status == LeadStatus.NEW


def test_change_status_missing_lead(client):
    assert client.patch("/api/leads/999999", json={"status": "won"}).status_code == 404
