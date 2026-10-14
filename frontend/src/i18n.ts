import { LeadStatus } from "./api";

export type Lang = "ru" | "uz";

export const LANGS: { value: Lang; label: string }[] = [
  { value: "ru", label: "RU" },
  { value: "uz", label: "UZ" },
];

/** Тексты интерфейса. Узбекский: латиница (официальный алфавит), oʻ и gʻ через U+02BB. */
const ru = {
  /** «14 окт.» */
  date: (d: Date) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(d),
  pageTitle: "Заявки — CRM",
  sections: "Разделы",
  nav: {
    leads: "Заявки",
    contacts: "Контакты",
    deals: "Сделки",
    tasks: "Задачи",
    messages: "Сообщения",
  },
  soon: "скоро",
  title: "Заявки",
  loading: "Загрузка…",
  count(n: number): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} заявка`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} заявки`;
    return `${n} заявок`;
  },
  newLead: "Новая заявка",
  list: "Список заявок",
  filter: "Фильтр по статусу",
  all: "Все",
  colName: "Имя",
  colPhone: "Телефон",
  colStatus: "Статус",
  colAdded: "Добавлена",
  statusFor: (name: string) => `Статус для ${name}`,
  emptyAll: "Заявок пока нет.",
  emptyStatus: (status: string) => `Нет заявок со статусом «${status}».`,
  showAll: "Показать все",
  close: "Закрыть",
  namePlaceholder: "Например, Тестовый Клиент",
  add: "Добавить",
  saving: "Сохраняем…",
  added: (name: string) => `Заявка «${name}» добавлена.`,
  statusChanged: (name: string, status: string) => `Статус заявки «${name}»: ${status}.`,
  errors: {
    loadLeads: "Не удалось загрузить заявки.",
    loadStatuses: "Не удалось загрузить статусы.",
    add: "Не удалось добавить заявку.",
    status: "Не удалось сменить статус.",
    name: "Укажите имя.",
    phone: "Телефон в формате +998XXXXXXXXX (12 цифр после плюса).",
  },
  statuses: {
    new: "Новая",
    in_progress: "В работе",
    won: "Успешно",
    lost: "Отказ",
  } as Record<LeadStatus, string>,
};

export type Dict = typeof ru;

const UZ_MONTHS = [
  "yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek",
];

const uz: Dict = {
  // Свои названия месяцев: в данных браузеров для uz сокращений нет («M10 14»).
  date: (d: Date) => `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}`,
  pageTitle: "Arizalar — CRM",
  sections: "Boʻlimlar",
  nav: {
    leads: "Arizalar",
    contacts: "Kontaktlar",
    deals: "Bitimlar",
    tasks: "Vazifalar",
    messages: "Xabarlar",
  },
  soon: "tez orada",
  title: "Arizalar",
  loading: "Yuklanmoqda…",
  count: (n: number) => `${n} ta ariza`,
  newLead: "Yangi ariza",
  list: "Arizalar roʻyxati",
  filter: "Holat boʻyicha filtr",
  all: "Barchasi",
  colName: "Ism",
  colPhone: "Telefon",
  colStatus: "Holat",
  colAdded: "Qoʻshilgan",
  statusFor: (name: string) => `${name} uchun holat`,
  emptyAll: "Hozircha arizalar yoʻq.",
  emptyStatus: (status: string) => `«${status}» holatidagi arizalar yoʻq.`,
  showAll: "Barchasini koʻrsatish",
  close: "Yopish",
  namePlaceholder: "Masalan, Test Mijoz",
  add: "Qoʻshish",
  saving: "Saqlanmoqda…",
  added: (name: string) => `«${name}» arizasi qoʻshildi.`,
  statusChanged: (name: string, status: string) => `«${name}» arizasi holati: ${status}.`,
  errors: {
    loadLeads: "Arizalarni yuklab boʻlmadi.",
    loadStatuses: "Holatlarni yuklab boʻlmadi.",
    add: "Arizani qoʻshib boʻlmadi.",
    status: "Holatni oʻzgartirib boʻlmadi.",
    name: "Ismni kiriting.",
    phone: "Telefon +998XXXXXXXXX formatida boʻlishi kerak (plyusdan keyin 12 ta raqam).",
  },
  statuses: {
    new: "Yangi",
    in_progress: "Jarayonda",
    won: "Muvaffaqiyatli",
    lost: "Rad etildi",
  },
};

export const DICTS: Record<Lang, Dict> = { ru, uz };

const STORAGE_KEY = "crm.lang";

/** Язык: сохранённый выбор, иначе язык браузера, иначе русский. */
export function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ru" || saved === "uz") return saved;
  } catch {
    // localStorage может быть недоступен (приватный режим).
  }
  return navigator.language.toLowerCase().startsWith("uz") ? "uz" : "ru";
}

export function saveLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Не страшно: выбор просто не запомнится.
  }
}
