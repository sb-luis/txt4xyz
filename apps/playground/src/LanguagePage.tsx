import { useCallback, useState } from "react";
import { Txt4Editor, usePlayback } from "@txt4/core";
import type { LanguageEntry } from "./languages";
import { navigate } from "./router";

function snippetFromSearch(entry: LanguageEntry) {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("snippet");
  return entry.snippets.find((s) => s.id === id) ?? entry.snippets[0];
}

// Keyed by entry.id at the call site (see App.tsx) so a language switch
// remounts this component instead of needing an effect to resync state.
export function LanguagePage({ entry }: { entry: LanguageEntry }) {
  const [snippet, setSnippet] = useState(() => snippetFromSearch(entry));
  const [doc, setDoc] = useState(snippet.code);
  const [steps, setSteps] = useState<Parameters<typeof usePlayback>[0]>(null);
  const [error, setError] = useState<string | null>(null);

  const onRequestRecording = useCallback(async () => {
    const outcome = await entry.runner.run(doc);
    setSteps(outcome.steps);
    setError(outcome.error);
  }, [entry, doc]);

  const playback = usePlayback(steps, error, () => {
    void onRequestRecording();
  });

  const selectSnippet = (next: typeof snippet) => {
    setSnippet(next);
    setDoc(next.code);
    setSteps(null);
    setError(null);
    playback.reset();
    navigate(`${entry.path}?snippet=${next.id}`);
  };

  return (
    <div className="flex h-screen min-h-0 flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2">
        <a
          href="/"
          onClick={(e) => {
            if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            navigate("/");
          }}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← languages
        </a>
        <h1 className="text-sm font-semibold text-slate-100">{entry.name}</h1>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-56 min-h-0 flex-col overflow-y-auto border-r border-slate-800 bg-slate-900">
          <h2 className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Snippets
          </h2>
          <ul className="flex flex-col gap-0.5 px-2 pb-3">
            {entry.snippets.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => selectSnippet(s)}
                  className={`w-full rounded px-2 py-1.5 text-left text-sm transition-colors ${
                    s.id === snippet.id
                      ? "bg-sky-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                  }`}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="min-w-0 flex-1 min-h-0 p-3">
          <div className="h-full min-h-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 font-mono text-sm">
            <Txt4Editor
              key={`${entry.id}-${snippet.id}`}
              initialDoc={doc}
              onChange={(next) => {
                setDoc(next);
                setSteps(null);
                setError(null);
              }}
              extensions={entry.extensions}
              currentLine={playback.currentLine}
              colors={{ runColor: "#61afef" }}
            />
          </div>
        </main>

        <aside className="flex w-96 min-h-0 flex-col border-l border-slate-800 bg-slate-900">
          <div className="flex flex-wrap gap-2 border-b border-slate-800 p-3">
            <button
              onClick={playback.stepBack}
              disabled={!playback.canStepBack}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600"
            >
              ◀ step
            </button>
            {playback.phase === "playing" ? (
              <button
                onClick={playback.pause}
                className="rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-700"
              >
                pause
              </button>
            ) : (
              <button
                onClick={playback.play}
                className="rounded border border-sky-700 bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-500"
              >
                play
              </button>
            )}
            <button
              onClick={playback.stepForward}
              disabled={!playback.canStepForward}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600"
            >
              step ▶
            </button>
            <button
              onClick={playback.reset}
              disabled={!playback.canReset}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600"
            >
              reset
            </button>
          </div>

          <div className="flex gap-4 border-b border-slate-800 px-3 py-2 text-xs text-slate-400">
            <span>
              phase: <span className="text-slate-200">{playback.phase}</span>
            </span>
            <span>
              step: <span className="text-slate-200">{playback.stepNumber ?? "-"}</span>
            </span>
            <span>
              line: <span className="text-slate-200">{playback.currentLine ?? "-"}</span>
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            {playback.visibleOutputs.length === 0 && !playback.errorRevealed && (
              <p className="text-sm text-slate-600">No output yet.</p>
            )}
            <ul className="flex flex-col gap-1">
              {playback.visibleOutputs.map((output, i) => (
                <li key={i} className="rounded bg-slate-800/60 px-2 py-1 font-mono text-sm text-slate-200">
                  {entry.renderOutput(output)}
                </li>
              ))}
            </ul>
            {playback.errorRevealed && (
              <div className="mt-2 rounded border border-red-800 bg-red-950 px-2 py-1.5 font-mono text-sm text-red-300">
                error: {playback.errorRevealed}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
