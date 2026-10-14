import { FormEvent, useCallback, useEffect, useState } from "react";
import { ApiError, Lead, LeadStatus, NewLead, StatusOption, api } from "./api";
import { searchLeads } from "./search";

const EMPTY_FORM: NewLead = { name: "", phone: "", status: "new" };

/** Фильтр хранится в адресе (?status=won), чтобы ссылку можно было отправить. */
function readFilter(statuses: StatusOption[]): LeadStatus | "" {
  const value = new URLSearchParams(window.location.search).get("status") ?? "";
  return statuses.some((s) => s.value === value) ? (value as LeadStatus) : "";
}

export default function LeadsPage() {
  const [statuses, setStatuses] = useState<StatusOption[]>([]);
  const [filter, setFilter] = useState<LeadStatus | "">("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<NewLead>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const visibleLeads = searchLeads(leads, query);

  const labelOf = (status: LeadStatus) =>
    statuses.find((s) => s.value === status)?.label ?? status;

  const loadLeads = useCallback(async (status: LeadStatus | "") => {
    try {
      setLeads(await api.leads(status || undefined));
    } catch {
      setMessage({ text: "Не удалось загрузить заявки.", error: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api
      .statuses()
      .then((list) => {
        setStatuses(list);
        setFilter(readFilter(list));
      })
      .catch(() => setMessage({ text: "Не удалось загрузить статусы.", error: true }));
  }, []);

  useEffect(() => {
    if (statuses.length) loadLeads(filter);
  }, [filter, statuses, loadLeads]);

  useEffect(() => {
    const onPop = () => setFilter(readFilter(statuses));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [statuses]);

  function changeFilter(status: LeadStatus | "") {
    const url = status ? `?status=${status}` : window.location.pathname;
    window.history.pushState(null, "", url);
    setFilter(status);
  }

  async function addLead(e: FormEvent) {
    e.preventDefault();
    setFormErrors({});
    try {
      const lead = await api.createLead(form);
      setForm(EMPTY_FORM);
      setMessage({ text: `Заявка «${lead.name}» добавлена.` });
      await loadLeads(filter);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setFormErrors(err.fieldErrors);
      } else {
        setMessage({ text: "Не удалось добавить заявку.", error: true });
      }
    }
  }

  async function changeStatus(lead: Lead, status: LeadStatus) {
    try {
      const updated = await api.setStatus(lead.id, status);
      setMessage({ text: `Статус заявки «${updated.name}»: ${labelOf(updated.status)}.` });
      await loadLeads(filter);
    } catch {
      setMessage({ text: "Не удалось сменить статус.", error: true });
    }
  }

  return (
    <main>
      <h1>Заявки</h1>

      {message && (
        <div className={message.error ? "msg error" : "msg"} role="status">
          {message.text}
        </div>
      )}

      <section className="card">
        <h2>Новая заявка</h2>
        <form onSubmit={addLead} className="row" noValidate>
          <div>
            <label htmlFor="name">Имя</label>
            <input
              id="name"
              value={form.name}
              maxLength={150}
              placeholder="Например, Тестовый Клиент"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {formErrors.name && <div className="errors">{formErrors.name}</div>}
          </div>
          <div>
            <label htmlFor="phone">Телефон</label>
            <input
              id="phone"
              value={form.phone}
              maxLength={25}
              placeholder="+998 00 000-00-01"
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            {formErrors.phone && <div className="errors">{formErrors.phone}</div>}
          </div>
          <div>
            <label htmlFor="status">Статус</label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button type="submit">Добавить</button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="search">
          <label htmlFor="lead-search">Поиск заявок</label>
          <input
            id="lead-search"
            type="search"
            value={query}
            placeholder="Имя или телефон"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="filters">
          Фильтр по статусу:
          <button
            type="button"
            className={filter === "" ? "link active" : "link"}
            onClick={() => changeFilter("")}
          >
            Все
          </button>
          {statuses.map((s) => (
            <button
              key={s.value}
              type="button"
              className={filter === s.value ? "link active" : "link"}
              onClick={() => changeFilter(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <table>
          <thead>
            <tr>
              <th>Имя</th>
              <th>Телефон</th>
              <th>Статус</th>
              <th>Сменить статус</th>
            </tr>
          </thead>
          <tbody>
            {visibleLeads.map((lead) => (
              <tr key={lead.id}>
                <td>{lead.name}</td>
                <td>{lead.phone}</td>
                <td>
                  <span className={`badge ${lead.status}`}>{labelOf(lead.status)}</span>
                </td>
                <td>
                  <select
                    aria-label={`Статус для ${lead.name}`}
                    value={lead.status}
                    onChange={(e) => changeStatus(lead, e.target.value as LeadStatus)}
                  >
                    {statuses.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {!loading && visibleLeads.length === 0 && (
              <tr>
                <td colSpan={4}>{query.trim() ? "Заявки не найдены" : "Заявок нет."}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
