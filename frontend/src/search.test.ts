import { describe, expect, it } from "vitest";
import type { Lead } from "./api";
import { searchLeads } from "./search";

const leads: Lead[] = [
  { id: 1, name: "Тестовый Али", phone: "+998 00 000-00-01", status: "new", created_at: "", updated_at: "" },
  { id: 2, name: "Мария Пример", phone: "+998 00 000-00-02", status: "won", created_at: "", updated_at: "" },
  { id: 3, name: "Алина Демо", phone: "+998 00 000-00-03", status: "won", created_at: "", updated_at: "" },
];

describe("поиск заявок", () => {
  it("находит часть имени без учета регистра", () => {
    expect(searchLeads(leads, "аЛИ").map((lead) => lead.id)).toEqual([1, 3]);
  });

  it("находит часть телефона", () => {
    expect(searchLeads(leads, "00-02").map((lead) => lead.id)).toEqual([2]);
  });

  it("работает на списке, уже ограниченном фильтром статуса", () => {
    const won = leads.filter((lead) => lead.status === "won");
    expect(searchLeads(won, "али").map((lead) => lead.id)).toEqual([3]);
  });

  it("возвращает пустой список, если совпадений нет", () => {
    expect(searchLeads(leads, "Несуществующее имя")).toEqual([]);
  });

  it("пустой запрос не скрывает заявки", () => {
    expect(searchLeads(leads, "  ")).toEqual(leads);
  });
});
