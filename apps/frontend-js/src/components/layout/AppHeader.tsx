import type { RunnerStatus } from "@/lib/python/runner";
import type { ConnectionStatus } from "@/lib/collab/provider";
import type { Participant } from "@/lib/collab/useRoom";
import { ParticipantsList } from "@/components/collab/ParticipantsList";
import { RunStopButton } from "@/components/ui/RunStopButton";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

export interface AppHeaderProps {
  status: RunnerStatus;
  onRun: () => void;
  onStop: () => void;
  room: { status: ConnectionStatus; rejectedCode: number | null; participants: Participant[] };
}

export function AppHeader({ status, onRun, onStop, room }: AppHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-2">
      <span className="font-mono text-lg font-semibold text-app-fg">
        txt4xyz
      </span>
      <div className="flex shrink-0 items-center gap-3">
        <ParticipantsList room={room} />
        <RunStopButton status={status} onRun={onRun} onStop={onStop} />
        <ThemeSwitcher />
      </div>
    </header>
  );
}
