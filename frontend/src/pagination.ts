import type { Lead } from "./api";

export const PAGE_SIZE = 5;

export function paginateLeads(leads: Lead[], requestedPage: number) {
  const pageCount = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * PAGE_SIZE;

  return {
    items: leads.slice(start, start + PAGE_SIZE),
    page,
    pageCount,
    hasPrevious: page > 1,
    hasNext: page < pageCount,
  };
}
