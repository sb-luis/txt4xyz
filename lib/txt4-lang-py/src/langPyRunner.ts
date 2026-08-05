import type { ExecutionOutcome, ExecutionRunner } from "@txt4/core";
import { LangPyRunnerClient } from "./runner.js";
import { timelineToPlaybackSteps } from "./timelineToPlaybackSteps.js";
import type { OutputEntry } from "./runner.js";
import type { StepEvent } from "./protocol.js";

// `LangPyRunnerClient` spawns its worker in its own constructor, so the
// client is created lazily on the first run() call rather than eagerly here.
// A failed boot reports status "error" (not "ready") without forwarding a
// message, hence this fixed fallback string.
const INIT_FAILURE_ERROR = "Python runtime initialization failed";

export function createLangPyRunner(): ExecutionRunner<OutputEntry> & { dispose(): void } {
  let client: LangPyRunnerClient | null = null;
  let initReady: Promise<void> | null = null;
  // Sticky per client instance: once the worker reports "error" there is no
  // live worker to send a run to (its own internal `ready` promise rejected
  // and every subsequent message handler is a no-op), so every run() against
  // this client short-circuits with the same error instead of hanging.
  let initFailed = false;

  // Set immediately before each runTraced() call and cleared once its
  // outcome resolves. Safe because run() below serializes all calls onto a
  // single chain, so at most one traced run -- and one set of these -- is
  // ever in flight against the shared client.
  let onRunSettled: (() => void) | null = null;
  let capturedSteps: StepEvent[] = [];
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
          // Settles a run that was already in flight when init failed. The
          // client only ever reaches "error" before its first "ready" today,
          // so onRunSettled is normally unset here -- this exists so a
          // future "error" mid-run (or a client behavior change) settles
          // the run instead of hanging it, same as the init-time case.
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
      onOutput: () => {},
      // A traced run always posts run-timeline before its terminal
      // run-result/run-error message (see runTraced() in runner.worker.ts),
      // so by the time onStatusChange("ready") fires below, both of these
      // have already been populated for the run that just finished.
      onTimeline: (steps) => {
        capturedSteps = steps;
      },
      onTracedError: (traceback) => {
        capturedError = traceback;
      },
    });

    return { client, ready: initReady };
  }

  function runOnce(
    activeClient: LangPyRunnerClient,
    ready: Promise<void>,
    code: string,
  ): Promise<ExecutionOutcome<OutputEntry>> {
    return ready.then(() => {
      if (initFailed) {
        return { steps: [], error: INIT_FAILURE_ERROR };
      }
      return new Promise<ExecutionOutcome<OutputEntry>>((resolve) => {
        capturedSteps = [];
        capturedError = null;
        onRunSettled = () => {
          onRunSettled = null;
          resolve({ steps: timelineToPlaybackSteps(capturedSteps), error: capturedError });
        };
        activeClient.runTraced(code);
      });
    });
  }

  let chain: Promise<unknown> = Promise.resolve();

  return {
    run(code: string) {
      // getClient() runs synchronously here (not inside the chained
      // callback) so the worker spawns on this call even while a previous
      // run is still in flight -- only the actual runTraced() dispatch is
      // serialized behind the chain.
      const { client: activeClient, ready } = getClient();
      const result = chain.then(() => runOnce(activeClient, ready, code));
      chain = result.catch(() => {});
      return result;
    },
    dispose() {
      client?.dispose();
      client = null;
      initReady = null;
    },
  };
}
