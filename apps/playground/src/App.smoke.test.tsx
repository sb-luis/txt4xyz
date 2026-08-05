import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { LanguagePage } from "./LanguagePage";
import { languages } from "./languages";

describe("App smoke", () => {
  it("mounts Txt4Editor without a dual-CodeMirror-instance error", () => {
    const entry = languages[0];
    expect(() => render(<LanguagePage entry={entry} />)).not.toThrow();
  });
});
