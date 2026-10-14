from sqlalchemy import select

from app.models import Lead, LeadStatus


def _lead(factory, name):
    with factory() as s:
        return s.scalar(select(Lead).where(Lead.name == name))


def test_list_shows_table(client):
    html = client.get("/").text
    for text in ("<th>Имя</th>", "<th>Телефон</th>", "<th>Статус</th>", "Тест Новый", "Тест Успешный"):
        assert text in html


def test_add_lead(client, csrf, session_factory):
    resp = client.post(
        "/", data={"name": "Тест Добавленный", "phone": "+998 00 000-00-13", "status": "new", "csrf_token": csrf}
    )
    assert resp.status_code == 200  # после редиректа 303
    assert "Заявка «Тест Добавленный» добавлена." in resp.text
    assert _lead(session_factory, "Тест Добавленный").phone == "+998000000013"


def test_add_lead_invalid_phone(client, csrf, session_factory):
    resp = client.post("/", data={"name": "Ошибка", "phone": "12345", "status": "new", "csrf_token": csrf})
    assert resp.status_code == 422
    assert "Телефон в формате" in resp.text
    assert _lead(session_factory, "Ошибка") is None


def test_add_lead_without_csrf_rejected(client, session_factory):
    resp = client.post("/", data={"name": "Без токена", "phone": "+998000000014", "status": "new"})
    assert resp.status_code == 403
    assert _lead(session_factory, "Без токена") is None


def test_filter_by_status(client):
    html = client.get("/", params={"status": "won"}).text
    assert "Тест Успешный" in html
    assert "Тест Новый" not in html


def test_unknown_filter_shows_all(client):
    html = client.get("/", params={"status": "nope"}).text
    assert "Тест Новый" in html and "Тест Успешный" in html


def test_change_status(client, csrf, session_factory):
    lead = _lead(session_factory, "Тест Новый")
    resp = client.post(
        f"/leads/{lead.id}/status",
        data={"status": "in_progress", "return_status": "new", "csrf_token": csrf},
        follow_redirects=False,
    )
    assert resp.status_code == 303
    assert resp.headers["location"] == "/?status=new"
    assert _lead(session_factory, "Тест Новый").status == LeadStatus.IN_PROGRESS


def test_change_status_rejects_unknown_value(client, csrf, session_factory):
    lead = _lead(session_factory, "Тест Новый")
    client.post(f"/leads/{lead.id}/status", data={"status": "hacked", "csrf_token": csrf})
    assert _lead(session_factory, "Тест Новый").status == LeadStatus.NEW


def test_change_status_requires_post(client, session_factory):
    lead = _lead(session_factory, "Тест Новый")
    assert client.get(f"/leads/{lead.id}/status").status_code == 405
