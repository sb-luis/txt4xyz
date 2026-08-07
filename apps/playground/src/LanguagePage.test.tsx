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

const streamingEntry = defineLanguage<CustomOutput>({
  id: "streaming",
  path: "/lang-streaming",
  name: "Streaming",
  runner: {
    async run() {
      return { steps: [], error: null };
    },
  },
  streamingRunner: {
    async run(_code, onOutput) {
      onOutput({ value: "one" });
      onOutput({ value: "traceback" });
      return { error: "boom" };
    },
  },
  snippets: [{ id: "only", title: "Only", code: "line one" }],
  extensions: [],
  renderOutput: (output) => `rendered:${output.value}`,
});

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

describe("LanguagePage run mode", () => {
  afterEach(() => {
    setSearch("");
  });

  it("disables the Run toggle when the entry has no streamingRunner", () => {
    window.history.pushState(null, "", customEntry.path);
    render(<LanguagePage entry={customEntry} />);
    expect((screen.getByText("Run") as HTMLButtonElement).disabled).toBe(true);
  });

  it("streams output via onOutput and never renders the resolved error as an extra line", async () => {
    window.history.pushState(null, "", streamingEntry.path);
    render(<LanguagePage entry={streamingEntry} />);
    fireEvent.click(screen.getByText("Run"));
    fireEvent.click(screen.getByText("run"));

    await waitFor(() => expect(screen.getByText("rendered:one")).not.toBeNull());
    expect(screen.getByText("rendered:traceback")).not.toBeNull();
    expect(screen.queryByText("boom")).toBeNull();
    expect(screen.getByText("error")).not.toBeNull();
  });

  it("disables Stop when the streamingRunner declares no stop (non-cancellable, e.g. JS)", () => {
    window.history.pushState(null, "", streamingEntry.path);
    render(<LanguagePage entry={streamingEntry} />);
    fireEvent.click(screen.getByText("Run"));
    expect((screen.getByText("stop") as HTMLButtonElement).disabled).toBe(true);
  });
});
