import { useCallback, useEffect, useRef, useState } from "react";
import {
  LangPyRunnerClient,
  type DataframePage,
  type OutputEntry,
  type RunnerStatus,
} from "./runner";
import type { DataframeSort, StepEvent } from "./protocol";

export interface UseLangPyRunnerCallbacks {
  onTimeline?: (steps: StepEvent[]) => void;
  onTracedError?: (traceback: string) => void;
}

export interface UseLangPyRunnerResult {
  status: RunnerStatus;
  output: OutputEntry[];
  run: (code: string) => void;
  runTraced: (code: string) => void;
  stop: () => void;
  clearOutput: () => void;
  fetchDataframePage: (
    handle: string,
    offset: number,
    limit: number,
    sort: DataframeSort | null,
  ) => Promise<DataframePage>;
}

export function useLangPyRunner(callbacks: UseLangPyRunnerCallbacks = {}): UseLangPyRunnerResult {
  const [status, setStatus] = useState<RunnerStatus>("loading");
  const [output, setOutput] = useState<OutputEntry[]>([]);
  const clientRef = useRef<LangPyRunnerClient | null>(null);
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const client = new LangPyRunnerClient({
      onStatusChange: setStatus,
      onOutput: (entry) => setOutput((prev) => [...prev, entry]),
      onTimeline: (steps) => callbacksRef.current.onTimeline?.(steps),
      onTracedError: (traceback) => callbacksRef.current.onTracedError?.(traceback),
    });
    clientRef.current = client;
    return () => {
      client.dispose();
      clientRef.current = null;
    };
  }, []);

  const run = useCallback((code: string) => {
    clientRef.current?.run(code);
  }, []);

  const runTraced = useCallback((code: string) => {
    clientRef.current?.runTraced(code);
  }, []);

  const stop = useCallback(() => {
    clientRef.current?.stop();
    setOutput([]);
  }, []);

  const clearOutput = useCallback(() => {
    setOutput([]);
  }, []);

  const fetchDataframePage = useCallback(
    (handle: string, offset: number, limit: number, sort: DataframeSort | null) => {
      const client = clientRef.current;
      if (!client) return Promise.reject(new Error("runner not ready"));
      return client.fetchDataframePage(handle, offset, limit, sort);
    },
    [],
  );

  return { status, output, run, runTraced, stop, clearOutput, fetchDataframePage };
}
