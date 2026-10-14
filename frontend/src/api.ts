export type LeadStatus = "new" | "in_progress" | "won" | "lost";

export interface Lead {
  id: number;
  name: string;
  phone: string;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

export interface StatusOption {
  value: LeadStatus;
  label: string;
}

export interface NewLead {
  name: string;
  phone: string;
  status: LeadStatus;
}

/** Ошибка API с сообщениями по полям: { phone: "..." }. */
export class ApiError extends Error {
  constructor(
    message: string,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await resp.json().catch(() => null);
  if (!resp.ok) {
    const fieldErrors = body?.errors ?? {};
    throw new ApiError(body?.detail ?? "Ошибка сервера", fieldErrors);
  }
  return body as T;
}

export const api = {
  statuses: () => request<StatusOption[]>("/api/statuses"),
  leads: (status?: LeadStatus) =>
    request<Lead[]>(status ? `/api/leads?status=${status}` : "/api/leads"),
  createLead: (data: NewLead) =>
    request<Lead>("/api/leads", { method: "POST", body: JSON.stringify(data) }),
  setStatus: (id: number, status: LeadStatus) =>
    request<Lead>(`/api/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
