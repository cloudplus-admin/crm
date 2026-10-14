import { describe, expect, it } from "vitest";
import { readListState, urlForListState } from "./listState";

describe("параметры списка в URL", () => {
  it("игнорирует неизвестные значения и некорректные номера страниц", () => {
    expect(readListState("?status=unknown&sort=invalid&page=0&q=Али")).toEqual({
      query: "Али", filter: "", sort: "newest", page: 1,
    });
    expect(readListState("?page=2x").page).toBe(1);
    expect(readListState("?page=999999999999999999999").page).toBe(1);
  });

  it("сохраняет другие параметры адреса и якорь", () => {
    expect(urlForListState("https://example.test/?tab=mine&status=won#list", {
      query: "Али", filter: "new", sort: "name", page: 2,
    })).toBe("/?tab=mine&q=%D0%90%D0%BB%D0%B8&status=new&sort=name&page=2#list");
  });
});
