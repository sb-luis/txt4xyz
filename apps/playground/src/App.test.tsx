import { afterEach, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

function setPath(path: string) {
  window.history.pushState(null, "", path);
}

describe("App routing", () => {
  const originalPath = window.location.pathname;

  afterEach(() => {
    setPath(originalPath);
  });

  it("resolves / to the language index", () => {
    setPath("/");
    render(<App />);
    expect(screen.getByText("txt4 playground")).toBeTruthy();
  });

  it("resolves /lang-js to the JS page", () => {
    setPath("/lang-js");
    render(<App />);
    expect(screen.getByRole("heading", { name: "langJs" })).toBeTruthy();
  });

  it("shows a fallback for an unknown path", () => {
    setPath("/nope");
    render(<App />);
    expect(screen.getByText(/No page at \/nope/)).toBeTruthy();
  });
});
