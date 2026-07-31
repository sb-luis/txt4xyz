import type { RunnerStatus } from "@/lib/python/runner";
import { Button } from "@/components/ui/button";

export interface RunStopButtonProps {
  status: RunnerStatus;
  onRun: () => void;
  onStop: () => void;
}

export function RunStopButton({ status, onRun, onStop }: RunStopButtonProps) {
  if (status === "running") {
    return (
      <Button variant="destructive" onClick={onStop}>
        Stop
      </Button>
    );
  }

  return (
    <Button disabled={status !== "ready"} onClick={onRun}>
      Run
    </Button>
  );
}
