import { describe, expect, it } from "vitest";
import type { Lead } from "./api";
import { searchLeads } from "./search";
import { sortLeads } from "./sort";

const leads: Lead[] = [
  { id: 2, name: "Яна Тест", phone: "+998 00 000-00-02", status: "won", created_at: "2026-10-12T10:00:00Z", updated_at: "" },
  { id: 3, name: "алина Демо", phone: "+998 00 000-00-03", status: "new", created_at: "2026-10-13T10:00:00Z", updated_at: "" },
  { id: 1, name: "Борис Пример", phone: "+998 00 000-00-01", status: "won", created_at: "2026-10-11T10:00:00Z", updated_at: "" },
  { id: 4, name: "Али Тест", phone: "+998 00 000-00-04", status: "won", created_at: "2026-10-13T10:00:00Z", updated_at: "" },
];

const ids = (items: Lead[]) => items.map((lead) => lead.id);

describe("сортировка заявок", () => {
  it("сначала новые: по дате и затем по id", () => {
    expect(ids(sortLeads(leads, "newest"))).toEqual([4, 3, 2, 1]);
  });

  it("сначала старые: по дате и затем по id", () => {
    expect(ids(sortLeads(leads, "oldest"))).toEqual([1, 2, 3, 4]);
  });

  it("по имени: без учета регистра", () => {
    expect(ids(sortLeads(leads, "name"))).toEqual([4, 3, 1, 2]);
  });

  it("сортирует результаты поиска по имени и телефону", () => {
    expect(ids(sortLeads(searchLeads(leads, "тест"), "oldest"))).toEqual([2, 4]);
    expect(ids(sortLeads(searchLeads(leads, "00-0"), "name"))).toEqual([4, 3, 1, 2]);
  });

  it("работает после фильтра статуса и поиска", () => {
    const won = leads.filter((lead) => lead.status === "won");
    expect(ids(sortLeads(searchLeads(won, "тест"), "newest"))).toEqual([4, 2]);
    expect(ids(sortLeads(searchLeads(won, "тест"), "oldest"))).toEqual([2, 4]);
    expect(ids(sortLeads(searchLeads(won, "тест"), "name"))).toEqual([4, 2]);
  });

  it("не меняет исходный список", () => {
    sortLeads(leads, "name");
    expect(ids(leads)).toEqual([2, 3, 1, 4]);
  });
});
