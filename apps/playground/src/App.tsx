import { useCallback, useMemo, useState } from "react";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { Txt4Editor, usePlayback, type ExecutionRunner } from "@txt4/core";
import { xyzlang, xyzlangRunner, type XyzOutput } from "@txt4/lang-xyz";
import { jsRunner, type JsOutput } from "@txt4/lang-js";
import { jsSamples, xyzlangSamples } from "./samples";

type LanguageId = "js" | "xyzlang";
type Output = JsOutput | XyzOutput;

const runners: Record<LanguageId, ExecutionRunner<Output>> = {
  js: jsRunner,
  xyzlang: xyzlangRunner,
};

const samples: Record<LanguageId, { happyPath: string; error: string }> = {
  js: jsSamples,
  xyzlang: xyzlangSamples,
};

const highlightStyle = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.keyword, color: "#c678dd" },
    { tag: tags.string, color: "#98c379" },
    { tag: tags.number, color: "#d19a66" },
    { tag: tags.comment, color: "#5c6370", fontStyle: "italic" },
  ]),
);

export function App() {
  const [language, setLanguage] = useState<LanguageId>("js");
  const [sample, setSample] = useState<"happyPath" | "error">("happyPath");
  const [doc, setDoc] = useState(jsSamples.happyPath);
  const [steps, setSteps] = useState<Parameters<typeof usePlayback<Output>>[0]>(null);
  const [error, setError] = useState<string | null>(null);

  const runner = runners[language];

  const onRequestRecording = useCallback(async () => {
    const outcome = await runner.run(doc);
    setSteps(outcome.steps);
    setError(outcome.error);
  }, [runner, doc]);

  const playback = usePlayback<Output>(steps, error, () => {
    void onRequestRecording();
  });

  const switchLanguage = (next: LanguageId, nextSample: "happyPath" | "error") => {
    setLanguage(next);
    setSample(nextSample);
    setDoc(samples[next][nextSample]);
    setSteps(null);
    setError(null);
    playback.reset();
  };

  const extensions = useMemo(
    () => (language === "xyzlang" ? [xyzlang(), highlightStyle] : [highlightStyle]),
    [language],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", gap: 8, padding: 8, borderBottom: "1px solid #444" }}>
        <button onClick={() => switchLanguage("js", "happyPath")}>JS: happy path</button>
        <button onClick={() => switchLanguage("js", "error")}>JS: error</button>
        <button onClick={() => switchLanguage("xyzlang", "happyPath")}>xyzlang: happy path</button>
        <button onClick={() => switchLanguage("xyzlang", "error")}>xyzlang: error</button>
        <span style={{ marginLeft: "auto" }}>language: {language}</span>
      </div>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Txt4Editor
            key={`${language}-${sample}`}
            initialDoc={doc}
            onChange={(next) => {
              setDoc(next);
              setSteps(null);
              setError(null);
            }}
            extensions={extensions}
            currentLine={playback.currentLine}
            colors={{ runColor: "#61afef" }}
          />
        </div>
        <div style={{ width: 320, padding: 8, borderLeft: "1px solid #444", overflow: "auto" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={playback.stepBack} disabled={!playback.canStepBack}>
              ◀ step
            </button>
            {playback.phase === "playing" ? (
              <button onClick={playback.pause}>pause</button>
            ) : (
              <button onClick={playback.play}>play</button>
            )}
            <button onClick={playback.stepForward} disabled={!playback.canStepForward}>
              step ▶
            </button>
            <button onClick={playback.reset} disabled={!playback.canReset}>
              reset
            </button>
          </div>
          <div>phase: {playback.phase}</div>
          <div>step: {playback.stepNumber ?? "-"}</div>
          <div>current line: {playback.currentLine ?? "-"}</div>
          <hr />
          {playback.visibleOutputs.map((output, i) => (
            <div key={i}>{output.text}</div>
          ))}
          {playback.errorRevealed && <div style={{ color: "tomato" }}>error: {playback.errorRevealed}</div>}
        </div>
      </div>
    </div>
  );
}
