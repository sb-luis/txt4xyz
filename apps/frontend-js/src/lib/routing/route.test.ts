import { afterEach, describe, expect, it } from "vitest";
import { currentRoute, resolveRoute } from "./route";

describe("resolveRoute", () => {
  it("maps /edit to the edit route", () => {
    expect(resolveRoute("/edit")).toBe("edit");
  });

  it("maps every other path to the home route", () => {
    expect(resolveRoute("/")).toBe("home");
    expect(resolveRoute("/whatever")).toBe("home");
    expect(resolveRoute("/edit/")).toBe("home");
  });
});

describe("currentRoute", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("reads the route from window.location.pathname", () => {
    window.history.pushState({}, "", "/edit");
    expect(currentRoute()).toBe("edit");

    window.history.pushState({}, "", "/");
    expect(currentRoute()).toBe("home");
  });
});
