import type { StreamingExecutionRunner } from "@txt4/core";
import { LangPyRunnerClient } from "./runner.js";
import type { OutputEntry } from "./runner.js";

const INIT_FAILURE_ERROR = "Python runtime initialization failed";

export function createLangPyStreamingRunner(): StreamingExecutionRunner<OutputEntry> & {
  dispose(): void;
} {
  let client: LangPyRunnerClient | null = null;
  let initReady: Promise<void> | null = null;
  let initFailed = false;

  let onRunSettled: (() => void) | null = null;
  let forwardOutput: ((entry: OutputEntry) => void) | null = null;
  let capturedError: string | null = null;

  function getClient(): { client: LangPyRunnerClient; ready: Promise<void> } {
    if (client && initReady) return { client, ready: initReady };

    let resolveInit!: () => void;
    let initResolved = false;
    initFailed = false;
    initReady = new Promise<void>((resolve) => {
      resolveInit = resolve;
    });

    client = new LangPyRunnerClient({
      onStatusChange: (status) => {
        if (status === "error") {
          initFailed = true;
          capturedError = INIT_FAILURE_ERROR;
          if (!initResolved) {
            initResolved = true;
            resolveInit();
          }
          onRunSettled?.();
          return;
        }
        if (status !== "ready") return;
        if (!initResolved) {
          initResolved = true;
          resolveInit();
          return;
        }
        onRunSettled?.();
      },
      // A traceback entry is the non-traced path's only signal that the run
      // failed, so it feeds both channels: output renders it, `error` reports
      // the outcome. Consumers render output and must not also print `error`.
      onOutput: (entry) => {
        if (entry.kind === "traceback") capturedError = entry.text;
        forwardOutput?.(entry);
      },
    });

    return { client, ready: initReady };
  }

  function runOnce(
    activeClient: LangPyRunnerClient,
    ready: Promise<void>,
    code: string,
    onOutput: (entry: OutputEntry) => void,
  ): Promise<{ error: string | null }> {
    return ready.then(() => {
      if (initFailed) {
        return { error: INIT_FAILURE_ERROR };
      }
      return new Promise<{ error: string | null }>((resolve) => {
        capturedError = null;
        forwardOutput = onOutput;
        onRunSettled = () => {
          onRunSettled = null;
          forwardOutput = null;
          resolve({ error: capturedError });
        };
        activeClient.run(code);
      });
    });
  }

  let chain: Promise<unknown> = Promise.resolve();

  return {
    run(code: string, onOutput: (entry: OutputEntry) => void) {
      const { client: activeClient, ready } = getClient();
      const result = chain.then(() => runOnce(activeClient, ready, code, onOutput));
      chain = result.catch(() => {});
      return result;
    },
    stop() {
      client?.stop();
    },
    dispose() {
      client?.dispose();
      client = null;
      initReady = null;
    },
  };
}
