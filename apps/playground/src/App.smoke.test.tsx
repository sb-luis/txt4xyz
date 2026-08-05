import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { App } from "./App";

describe("App smoke", () => {
  it("mounts Txt4Editor without a dual-CodeMirror-instance error", () => {
    expect(() => render(<App />)).not.toThrow();
  });
});
