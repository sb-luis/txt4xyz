import type { RunnerStatus } from "@/lib/python/runner";
import { Button } from "@/components/ui/Button";

export interface RunStopButtonProps {
  status: RunnerStatus;
  onRun: () => void;
  onStop: () => void;
}

export function RunStopButton({ status, onRun, onStop }: RunStopButtonProps) {
  if (status === "running") {
    return (
      <Button variant="danger" onClick={onStop}>
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
