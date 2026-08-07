import { PauseIcon, PlayIcon, RotateCcwIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlaybackPhase } from "@txt4/core";

export interface PlaybackControlsProps {
  phase: PlaybackPhase;
  canStepBack: boolean;
  canStepForward: boolean;
  canReset: boolean;
  onStepBack: () => void;
  onStepForward: () => void;
  onPlayPause: () => void;
  onReset: () => void;
}

export function PlaybackControls({
  phase,
  canStepBack,
  canStepForward,
  canReset,
  onStepBack,
  onStepForward,
  onPlayPause,
  onReset,
}: PlaybackControlsProps) {
  const isPlaying = phase === "playing";
  // Play/Pause stays clickable while recording so pressing it again doesn't
  // feel dead, but it's a no-op until the timeline it's waiting on arrives.
  const playPauseDisabled = phase !== "recording" && !isPlaying && !canStepForward;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={onStepBack}
        disabled={!canStepBack}
        aria-label="step backward"
      >
        <SkipBackIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onPlayPause}
        disabled={playPauseDisabled}
        aria-label={isPlaying ? "pause" : "play"}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onStepForward}
        disabled={!canStepForward}
        aria-label="step forward"
      >
        <SkipForwardIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onReset}
        disabled={!canReset}
        aria-label="reset"
      >
        <RotateCcwIcon />
      </Button>
    </>
  );
}
