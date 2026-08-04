import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaybackControls } from "./PlaybackControls";

describe("PlaybackControls", () => {
  it("disables step back/forward/reset per the given can* flags and calls the right handler when enabled", () => {
    const onStepBack = vi.fn();
    const onStepForward = vi.fn();
    const onReset = vi.fn();
    render(
      <PlaybackControls
        phase="idle"
        canStepBack={false}
        canStepForward={true}
        canReset={false}
        onStepBack={onStepBack}
        onStepForward={onStepForward}
        onPlayPause={vi.fn()}
        onReset={onReset}
      />,
    );

    expect((screen.getByRole("button", { name: "step backward" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "reset" }) as HTMLButtonElement).disabled).toBe(true);

    const forward = screen.getByRole("button", { name: "step forward" }) as HTMLButtonElement;
    expect(forward.disabled).toBe(false);
    fireEvent.click(forward);
    expect(onStepForward).toHaveBeenCalledTimes(1);
    expect(onStepBack).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();
  });

  it("shows Play when idle and Pause when playing, both wired to onPlayPause", () => {
    const onPlayPause = vi.fn();
    const { rerender } = render(
      <PlaybackControls
        phase="idle"
        canStepBack={false}
        canStepForward={true}
        canReset={false}
        onStepBack={vi.fn()}
        onStepForward={vi.fn()}
        onPlayPause={onPlayPause}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "play" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "play" }));
    expect(onPlayPause).toHaveBeenCalledTimes(1);

    rerender(
      <PlaybackControls
        phase="playing"
        canStepBack={true}
        canStepForward={false}
        canReset={true}
        onStepBack={vi.fn()}
        onStepForward={vi.fn()}
        onPlayPause={onPlayPause}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "pause" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "pause" }));
    expect(onPlayPause).toHaveBeenCalledTimes(2);
  });
});
