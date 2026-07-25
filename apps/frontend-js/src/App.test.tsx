import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/App";

describe("App", () => {
  it("renders the app shell with editor and output panes", () => {
    render(<App />);
    expect(screen.getByText("txt4.xyz")).toBeTruthy();
    expect(screen.getByRole("region", { name: "editor" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "output" })).toBeTruthy();
  });
});
