import { afterEach, describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LanguagePage } from "./LanguagePage";
import { languages, defineLanguage } from "./languages";

const jsEntry = languages.find((l) => l.id === "langJs")!;

type CustomOutput = { value: string };

const customEntry = defineLanguage<CustomOutput>({
  id: "custom",
  path: "/lang-custom",
  name: "Custom",
  runner: {
    async run() {
      return {
        steps: [{ line: 1, outputs: [{ value: "hello" }] }],
        error: null,
      };
    },
  },
  snippets: [{ id: "only", title: "Only", code: "line one" }],
  extensions: [],
  renderOutput: (output) => `rendered:${output.value}`,
});

function setSearch(search: string) {
  window.history.pushState(null, "", `${jsEntry.path}${search}`);
}

describe("LanguagePage snippets", () => {
  afterEach(() => {
    setSearch("");
  });

  it("loads the first snippet's code by default", () => {
    setSearch("");
    render(<LanguagePage entry={jsEntry} />);
    const editor = document.querySelector(".cm-content");
    expect(editor?.textContent).toContain("starting");
  });

  it("honours a recognised ?snippet= param on load", () => {
    setSearch("?snippet=single-line");
    render(<LanguagePage entry={jsEntry} />);
    const editor = document.querySelector(".cm-content");
    expect(editor?.textContent).toContain("hello");
  });

  it("falls back to the first snippet for an unrecognised ?snippet= param", () => {
    setSearch("?snippet=does-not-exist");
    render(<LanguagePage entry={jsEntry} />);
    const editor = document.querySelector(".cm-content");
    expect(editor?.textContent).toContain("starting");
  });

  it("replaces the editor contents when a snippet is clicked", () => {
    setSearch("");
    render(<LanguagePage entry={jsEntry} />);
    fireEvent.click(screen.getByText("Single line"));
    const editor = document.querySelector(".cm-content");
    expect(editor?.textContent).toContain("hello");
    expect(window.location.search).toContain("snippet=single-line");
  });
});

describe("LanguagePage output rendering", () => {
  afterEach(() => {
    setSearch("");
  });

  it("renders output through the entry's renderOutput rather than assuming a shape", async () => {
    window.history.pushState(null, "", customEntry.path);
    render(<LanguagePage entry={customEntry} />);
    fireEvent.click(screen.getByText("step ▶"));
    await waitFor(() => expect(screen.getByText("rendered:hello")).not.toBeNull());
  });
});
