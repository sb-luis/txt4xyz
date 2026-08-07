import { PlayIcon, SquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RunnerStatus } from "@txt4/lang-py";

export interface RunControlsProps {
  status: RunnerStatus;
  onRun: () => void;
  onStop: () => void;
}

export function RunControls({ status, onRun, onStop }: RunControlsProps) {
  const isRunning = status === "running";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={isRunning ? onStop : onRun}
      disabled={status === "loading" || status === "error"}
      aria-label={isRunning ? "stop" : "play"}
    >
      {isRunning ? <SquareIcon /> : <PlayIcon />}
    </Button>
  );
}
