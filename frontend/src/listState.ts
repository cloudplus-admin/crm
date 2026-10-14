import type { LeadStatus } from "./api";
import type { LeadSort } from "./sort";

export interface ListState {
  query: string;
  filter: LeadStatus | "";
  sort: LeadSort;
  page: number;
}

const STATUSES: LeadStatus[] = ["new", "in_progress", "won", "lost"];
const SORTS: LeadSort[] = ["newest", "oldest", "name"];

export function readListState(search: string): ListState {
  const params = new URLSearchParams(search);
  const status = params.get("status") ?? "";
  const order = params.get("sort") ?? "";
  const rawPage = params.get("page") ?? "";
  const parsedPage = /^[1-9]\d*$/.test(rawPage) ? Number(rawPage) : 1;

  return {
    query: params.get("q") ?? "",
    filter: STATUSES.includes(status as LeadStatus) ? (status as LeadStatus) : "",
    sort: SORTS.includes(order as LeadSort) ? (order as LeadSort) : "newest",
    page: Number.isSafeInteger(parsedPage) ? parsedPage : 1,
  };
}

export function urlForListState(href: string, state: ListState): string {
  const url = new URL(href);
  for (const key of ["q", "status", "sort", "page"]) url.searchParams.delete(key);
  if (state.query) url.searchParams.set("q", state.query);
  if (state.filter) url.searchParams.set("status", state.filter);
  if (state.sort !== "newest") url.searchParams.set("sort", state.sort);
  if (state.page > 1) url.searchParams.set("page", String(state.page));
  return url.pathname + url.search + url.hash;
}
