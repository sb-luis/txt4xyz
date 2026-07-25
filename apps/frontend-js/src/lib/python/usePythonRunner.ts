import { useCallback, useEffect, useRef, useState } from "react";
import { PythonRunnerClient, type OutputEntry, type RunnerStatus } from "./runner";

export interface UsePythonRunnerResult {
  status: RunnerStatus;
  output: OutputEntry[];
  run: (code: string) => void;
  stop: () => void;
  clearOutput: () => void;
}

export function usePythonRunner(): UsePythonRunnerResult {
  const [status, setStatus] = useState<RunnerStatus>("loading");
  const [output, setOutput] = useState<OutputEntry[]>([]);
  const clientRef = useRef<PythonRunnerClient | null>(null);

  useEffect(() => {
    const client = new PythonRunnerClient({
      onStatusChange: setStatus,
      onOutput: (entry) => setOutput((prev) => [...prev, entry]),
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

  const stop = useCallback(() => {
    clientRef.current?.stop();
    setOutput([]);
  }, []);

  const clearOutput = useCallback(() => {
    setOutput([]);
  }, []);

  return { status, output, run, stop, clearOutput };
}
