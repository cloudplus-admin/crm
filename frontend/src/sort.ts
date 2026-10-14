import type { Lead } from "./api";

export type LeadSort = "newest" | "oldest" | "name";

const nameCollator = new Intl.Collator("ru", { sensitivity: "base" });

export function sortLeads(leads: Lead[], order: LeadSort): Lead[] {
  return [...leads].sort((a, b) => {
    if (order === "name") {
      return nameCollator.compare(a.name, b.name) || a.id - b.id;
    }

    const byDate = Date.parse(a.created_at) - Date.parse(b.created_at);
    const byId = a.id - b.id;
    return order === "oldest" ? byDate || byId : -byDate || -byId;
  });
}
