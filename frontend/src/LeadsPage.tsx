import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ApiError, Lead, LeadStatus, NewLead, StatusOption, api } from "./api";
import { DICTS, LANGS, Lang, initialLang, saveLang } from "./i18n";

const EMPTY_FORM: NewLead = { name: "", phone: "", status: "new" };

const NAV = [
  { key: "leads", icon: "inbox", active: true },
  { key: "contacts", icon: "users" },
  { key: "deals", icon: "deals" },
  { key: "tasks", icon: "tasks" },
  { key: "messages", icon: "chat" },
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
  const [lang, setLang] = useState<Lang>(initialLang);
  const nameInput = useRef<HTMLInputElement>(null);

  const t = DICTS[lang];
  // Для колбэков, созданных один раз: всегда актуальный язык.
  const tRef = useRef(t);
  tRef.current = t;
  const labelOf = (status: LeadStatus) => t.statuses[status] ?? status;
  // Сообщения API на русском; для известных полей показываем перевод.
  const fieldError = (field: "name" | "phone") =>
    formErrors[field] && (lang === "ru" ? formErrors[field] : t.errors[field]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.pageTitle;
    saveLang(lang);
  }, [lang, t]);
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
      setMessage({ text: tRef.current.errors.loadLeads, error: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatuses()
      .then((list) => setFilter(readFilter(list)))
      .catch(() => setMessage({ text: tRef.current.errors.loadStatuses, error: true }));
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
      setMessage({ text: t.added(lead.name) });
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setFormErrors(err.fieldErrors);
      } else {
        setMessage({ text: t.errors.add, error: true });
      }
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(lead: Lead, status: LeadStatus) {
    try {
      const updated = await api.setStatus(lead.id, status);
      setHighlight(updated.id);
      setMessage({ text: t.statusChanged(updated.name, labelOf(updated.status)) });
      await refresh();
    } catch {
      setMessage({ text: t.errors.status, error: true });
    }
  }

  const tabs: { value: LeadStatus | ""; label: string; count: number }[] = [
    { value: "", label: t.all, count: total },
    ...statuses.map((s) => ({ ...s, label: labelOf(s.value) })),
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">C</span>
          <span className="brand-name">CRM</span>
        </div>
        <nav className="nav" aria-label={t.sections}>
          {NAV.map((item) => (
            <a
              key={item.key}
              href={"active" in item ? "/" : undefined}
              className={"active" in item ? "nav-item active" : "nav-item disabled"}
              aria-current={"active" in item ? "page" : undefined}
              aria-disabled={"active" in item ? undefined : true}
              title={"active" in item ? undefined : t.soon}
            >
              <Icon name={item.icon} />
              <span>{t.nav[item.key]}</span>
              {!("active" in item) && <span className="soon">{t.soon}</span>}
            </a>
          ))}
        </nav>
        <div className="lang" role="group" aria-label="Til / Язык">
          {LANGS.map((l) => (
            <button
              key={l.value}
              type="button"
              lang={l.value}
              className={lang === l.value ? "active" : undefined}
              aria-pressed={lang === l.value}
              onClick={() => setLang(l.value)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </aside>

      <main className="content">
        <header className="page-header">
          <div>
            <h1>{t.title}</h1>
            <p className="subtitle">{statuses.length ? t.count(total) : t.loading}</p>
          </div>
          <button type="button" className="btn primary add-toggle" onClick={() => setFormOpen(true)}>
            <Icon name="plus" />
            <span>{t.newLead}</span>
          </button>
        </header>

        <div className="layout">
          <section className="list-card" aria-label={t.list}>
            <div className="tabs" role="tablist" aria-label={t.filter}>
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
                  <th>{t.colName}</th>
                  <th>{t.colPhone}</th>
                  <th>{t.colStatus}</th>
                  <th className="col-date">{t.colAdded}</th>
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
                        aria-label={t.statusFor(lead.name)}
                        value={lead.status}
                        onChange={(e) => changeStatus(lead, e.target.value as LeadStatus)}
                      >
                        {statuses.map((s) => (
                          <option key={s.value} value={s.value}>
                            {labelOf(s.value)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="col-date">{t.date(new Date(lead.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && leads.length === 0 && (
              <div className="empty">
                <Icon name="inbox" />
                <p>{filter ? t.emptyStatus(labelOf(filter)) : t.emptyAll}</p>
                {filter && (
                  <button type="button" className="btn ghost" onClick={() => changeFilter("")}>
                    {t.showAll}
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
              <h2 id="form-title">{t.newLead}</h2>
              <button
                type="button"
                className="icon-btn close"
                aria-label={t.close}
                onClick={() => setFormOpen(false)}
              >
                <Icon name="close" />
              </button>
            </div>
            <form onSubmit={addLead} noValidate>
              <div className="field">
                <label htmlFor="name">{t.colName}</label>
                <input
                  id="name"
                  ref={nameInput}
                  value={form.name}
                  maxLength={150}
                  autoComplete="off"
                  placeholder={t.namePlaceholder}
                  aria-invalid={!!formErrors.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                {fieldError("name") && <div className="error">{fieldError("name")}</div>}
              </div>
              <div className="field">
                <label htmlFor="phone">{t.colPhone}</label>
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
                {fieldError("phone") && <div className="error">{fieldError("phone")}</div>}
              </div>
              <div className="field">
                <label htmlFor="status">{t.colStatus}</label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
                >
                  {statuses.map((s) => (
                    <option key={s.value} value={s.value}>
                      {labelOf(s.value)}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn primary block" disabled={saving}>
                {saving ? t.saving : t.add}
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
