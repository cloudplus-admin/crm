import { describe, expect, it } from "vitest";
import type { Lead } from "./api";
import { paginateLeads } from "./pagination";
import { searchLeads } from "./search";
import { sortLeads } from "./sort";

const leads: Lead[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  name: index % 2 ? `Демо ${index + 1}` : `Тест ${index + 1}`,
  phone: `+998 00 000-00-${String(index + 1).padStart(2, "0")}`,
  status: index % 2 ? "won" : "new",
  created_at: `2026-10-${String(index + 1).padStart(2, "0")}T10:00:00Z`,
  updated_at: "",
}));
const ids = (items: Lead[]) => items.map((lead) => lead.id);

describe("пагинация заявок", () => {
  it("показывает по 5 заявок на первой, средней и последней странице", () => {
    expect(ids(paginateLeads(leads, 1).items)).toEqual([1, 2, 3, 4, 5]);
    expect(ids(paginateLeads(leads, 2).items)).toEqual([6, 7, 8, 9, 10]);
    expect(ids(paginateLeads(leads, 3).items)).toEqual([11, 12]);
    expect(paginateLeads(leads, 3)).toMatchObject({ page: 3, pageCount: 3, hasPrevious: true, hasNext: false });
  });

  it("останавливает переходы на границах и корректирует страницу после сокращения списка", () => {
    expect(paginateLeads(leads, 0)).toMatchObject({ page: 1, hasPrevious: false, hasNext: true });
    expect(paginateLeads(leads.slice(0, 6), 3)).toMatchObject({ page: 2, hasPrevious: true, hasNext: false });
  });

  it("показывает пустой результат без доступных переходов", () => {
    expect(paginateLeads([], 1)).toMatchObject({ items: [], page: 1, pageCount: 1, hasPrevious: false, hasNext: false });
  });

  it("делит на страницы только после поиска, фильтра и сортировки", () => {
    const filtered = leads.filter((lead) => lead.status === "new");
    const matched = searchLeads(filtered, "тест");
    const ordered = sortLeads(matched, "newest");
    expect(ids(paginateLeads(ordered, 1).items)).toEqual([11, 9, 7, 5, 3]);
    expect(ids(paginateLeads(ordered, 2).items)).toEqual([1]);
  });
});
