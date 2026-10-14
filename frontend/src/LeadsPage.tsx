import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ApiError, Lead, LeadStatus, NewLead, StatusOption, api } from "./api";

const EMPTY_FORM: NewLead = { name: "", phone: "", status: "new" };

const NAV = [
  { label: "Заявки", icon: "inbox", active: true },
  { label: "Контакты", icon: "users" },
  { label: "Сделки", icon: "deals" },
  { label: "Задачи", icon: "tasks" },
  { label: "Сообщения", icon: "chat" },
] as const;

/** Фильтр хранится в адресе (?status=won), чтобы ссылку можно было отправить. */
function readFilter(statuses: StatusOption[]): LeadStatus | "" {
  const value = new URLSearchParams(window.location.search).get("status") ?? "";
  return statuses.some((s) => s.value === value) ? (value as LeadStatus) : "";
}

/** «+998000000001» -> «+998 00 000-00-01». */
function formatPhone(phone: string): string {
  const m = phone.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]}-${m[3]}-${m[4]}` : phone;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const dateFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });

function pluralLeads(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} заявка`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} заявки`;
  return `${n} заявок`;
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    inbox: "M4 13h4l2 3h4l2-3h4M5 5h14l1 8v6H4v-6z",
    users: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M21 19v-1a4 4 0 0 0-3-3.9M15.5 4.1a3 3 0 0 1 0 5.8",
    deals: "M4 7h16v12H4zM9 7V5h6v2M4 12h16",
    tasks: "M9 11l2 2 4-4M5 4h14v16H5z",
    chat: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
    plus: "M12 5v14M5 12h14",
    close: "M6 6l12 12M18 6L6 18",
    phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  };
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export default function LeadsPage() {
  const [statuses, setStatuses] = useState<StatusOption[]>([]);
  const [filter, setFilter] = useState<LeadStatus | "">("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState<NewLead>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  const labelOf = (status: LeadStatus) =>
    statuses.find((s) => s.value === status)?.label ?? status;
  const total = statuses.reduce((sum, s) => sum + s.count, 0);

  const loadStatuses = useCallback(async () => {
    const list = await api.statuses();
    setStatuses(list);
    return list;
  }, []);

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
    loadStatuses()
      .then((list) => setFilter(readFilter(list)))
      .catch(() => setMessage({ text: "Не удалось загрузить статусы.", error: true }));
  }, [loadStatuses]);

  useEffect(() => {
    if (statuses.length) loadLeads(filter);
    // Счётчики обновляются после каждого действия; список здесь грузим только при смене фильтра.
  }, [filter, statuses.length, loadLeads]);

  useEffect(() => {
    const onPop = () => setFilter(readFilter(statuses));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [statuses]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!formOpen) return;
    nameInput.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFormOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen]);

  function changeFilter(status: LeadStatus | "") {
    const url = status ? `?status=${status}` : window.location.pathname;
    window.history.pushState(null, "", url);
    setFilter(status);
  }

  async function refresh() {
    await Promise.all([loadLeads(filter), loadStatuses().catch(() => undefined)]);
  }

  async function addLead(e: FormEvent) {
    e.preventDefault();
    setFormErrors({});
    setSaving(true);
    try {
      const lead = await api.createLead(form);
      setForm(EMPTY_FORM);
      setFormOpen(false);
      setHighlight(lead.id);
      setMessage({ text: `Заявка «${lead.name}» добавлена.` });
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setFormErrors(err.fieldErrors);
      } else {
        setMessage({ text: "Не удалось добавить заявку.", error: true });
      }
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(lead: Lead, status: LeadStatus) {
    try {
      const updated = await api.setStatus(lead.id, status);
      setHighlight(updated.id);
      setMessage({ text: `Статус заявки «${updated.name}»: ${labelOf(updated.status)}.` });
      await refresh();
    } catch {
      setMessage({ text: "Не удалось сменить статус.", error: true });
    }
  }

  const tabs: { value: LeadStatus | ""; label: string; count: number }[] = [
    { value: "", label: "Все", count: total },
    ...statuses,
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">C</span>
          <span className="brand-name">CRM</span>
        </div>
        <nav className="nav" aria-label="Разделы">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={"active" in item ? "/" : undefined}
              className={"active" in item ? "nav-item active" : "nav-item disabled"}
              aria-current={"active" in item ? "page" : undefined}
              aria-disabled={"active" in item ? undefined : true}
              title={"active" in item ? undefined : "Скоро"}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {!("active" in item) && <span className="soon">скоро</span>}
            </a>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="page-header">
          <div>
            <h1>Заявки</h1>
            <p className="subtitle">{statuses.length ? pluralLeads(total) : "Загрузка…"}</p>
          </div>
          <button type="button" className="btn primary add-toggle" onClick={() => setFormOpen(true)}>
            <Icon name="plus" />
            <span>Новая заявка</span>
          </button>
        </header>

        <div className="layout">
          <section className="list-card" aria-label="Список заявок">
            <div className="tabs" role="tablist" aria-label="Фильтр по статусу">
              {tabs.map((t) => (
                <button
                  key={t.value || "all"}
                  type="button"
                  role="tab"
                  aria-selected={filter === t.value}
                  className={`tab ${t.value || "all"}${filter === t.value ? " active" : ""}`}
                  onClick={() => changeFilter(t.value)}
                >
                  {t.value && <span className="dot" />}
                  {t.label}
                  <span className="tab-count">{t.count}</span>
                </button>
              ))}
            </div>

            <table className="leads">
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Телефон</th>
                  <th>Статус</th>
                  <th className="col-date">Добавлена</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  [0, 1, 2].map((i) => (
                    <tr key={i} className="skeleton">
                      <td colSpan={4}>
                        <span />
                      </td>
                    </tr>
                  ))}
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={highlight === lead.id ? "flash" : undefined}
                    onAnimationEnd={() => setHighlight(null)}
                  >
                    <td className="cell-name">
                      <div className="who">
                        <span className={`avatar ${lead.status}`} aria-hidden="true">
                          {initials(lead.name)}
                        </span>
                        <span className="name">{lead.name}</span>
                      </div>
                    </td>
                    <td className="cell-phone">
                      <a href={`tel:${lead.phone}`}>
                        <Icon name="phone" />
                        {formatPhone(lead.phone)}
                      </a>
                    </td>
                    <td className="cell-status">
                      <select
                        className={`status-select ${lead.status}`}
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
                    <td className="col-date">{dateFormat.format(new Date(lead.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && leads.length === 0 && (
              <div className="empty">
                <Icon name="inbox" />
                <p>{filter ? `Нет заявок со статусом «${labelOf(filter)}».` : "Заявок пока нет."}</p>
                {filter && (
                  <button type="button" className="btn ghost" onClick={() => changeFilter("")}>
                    Показать все
                  </button>
                )}
              </div>
            )}
          </section>

          <div
            className={formOpen ? "backdrop open" : "backdrop"}
            onClick={() => setFormOpen(false)}
            aria-hidden="true"
          />
          <section
            className={formOpen ? "form-panel open" : "form-panel"}
            aria-labelledby="form-title"
          >
            <div className="form-head">
              <h2 id="form-title">Новая заявка</h2>
              <button
                type="button"
                className="icon-btn close"
                aria-label="Закрыть"
                onClick={() => setFormOpen(false)}
              >
                <Icon name="close" />
              </button>
            </div>
            <form onSubmit={addLead} noValidate>
              <div className="field">
                <label htmlFor="name">Имя</label>
                <input
                  id="name"
                  ref={nameInput}
                  value={form.name}
                  maxLength={150}
                  autoComplete="off"
                  placeholder="Например, Тестовый Клиент"
                  aria-invalid={!!formErrors.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                {formErrors.name && <div className="error">{formErrors.name}</div>}
              </div>
              <div className="field">
                <label htmlFor="phone">Телефон</label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  maxLength={25}
                  autoComplete="off"
                  placeholder="+998 00 000-00-01"
                  aria-invalid={!!formErrors.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                {formErrors.phone && <div className="error">{formErrors.phone}</div>}
              </div>
              <div className="field">
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
              <button type="submit" className="btn primary block" disabled={saving}>
                {saving ? "Сохраняем…" : "Добавить"}
              </button>
            </form>
          </section>
        </div>
      </main>

      {message && (
        <div className={message.error ? "toast error" : "toast"} role="status">
          {message.text}
        </div>
      )}
    </div>
  );
}
