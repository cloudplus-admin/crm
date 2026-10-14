import type { Lead } from "./api";

export function searchLeads(leads: Lead[], query: string): Lead[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return leads;
  return leads.filter(
    (lead) =>
      lead.name.toLocaleLowerCase().includes(normalized) ||
      lead.phone.toLocaleLowerCase().includes(normalized),
  );
}
