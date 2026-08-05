import type { ReactNode } from "react";
import { txt4HighlightStyle, type ExecutionRunner, type ExtensionInput, type Snippet } from "@txt4/core";
import { langJsRunner, langJsSnippets, langJsSupport, type LangJsOutput } from "@txt4/lang-js";
import { createLangPyRunner, langPySnippets, langPySupport, type OutputEntry } from "@txt4/lang-py";

export interface LanguageEntry<TOutput = unknown> {
  id: string;
  path: string;
  name: string;
  runner: ExecutionRunner<TOutput>;
  snippets: Snippet[];
  extensions: ExtensionInput[];
  renderOutput: (output: TOutput) => ReactNode;
}

export function defineLanguage<TOutput>(entry: LanguageEntry<TOutput>): LanguageEntry<unknown> {
  // Each entry is authored and checked at its own TOutput; runner/renderOutput are
  // always invoked together on values produced by that same runner, so the erasure is sound.
  return entry as unknown as LanguageEntry<unknown>;
}

function renderLangPyOutput(output: OutputEntry): ReactNode {
  switch (output.kind) {
    case "stdout":
      return output.line;
    case "stderr":
      return <span className="text-red-400">{output.line}</span>;
    case "traceback":
      return <span className="text-red-400">{output.text}</span>;
    case "internal-error":
      return <span className="text-red-400">internal error: {output.message}</span>;
    case "dataframe":
      return (
        <span>
          dataframe [{output.rowCount} rows{output.truncated ? ", truncated" : ""}]: {output.columns.join(", ")}
        </span>
      );
    case "plot": {
      const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(output.svg)}`;
      return <img src={src} alt="plot output" className="max-h-80 max-w-full" />;
    }
    case "html":
      return <iframe srcDoc={output.html} sandbox="" title="rich output" className="h-40 w-full border-0 bg-white" />;
    case "image":
      return (
        <img
          src={`data:${output.mime};base64,${output.dataBase64}`}
          alt="image output"
          className="max-h-80 max-w-full"
        />
      );
    case "json":
      return <pre className="whitespace-pre-wrap">{JSON.stringify(output.value, null, 2)}</pre>;
  }
}

export const languages: LanguageEntry[] = [
  defineLanguage<LangJsOutput>({
    id: "langJs",
    path: "/lang-js",
    name: "langJs",
    runner: langJsRunner,
    snippets: langJsSnippets,
    extensions: [langJsSupport(), txt4HighlightStyle],
    renderOutput: (output) => output.text,
  }),
  defineLanguage<OutputEntry>({
    id: "langPy",
    path: "/lang-py",
    name: "langPy",
    runner: createLangPyRunner(),
    snippets: langPySnippets,
    extensions: [langPySupport(), txt4HighlightStyle],
    renderOutput: renderLangPyOutput,
  }),
];

export function languageByPath(path: string): LanguageEntry | undefined {
  return languages.find((lang) => lang.path === path);
}

export type { LangJsOutput, OutputEntry };
