import { useState } from "react";
import type { ConnectionStatus } from "@/lib/collab/provider";
import type { Participant } from "@/lib/collab/useRoom";
import { ParticipantsList } from "@/components/collab/ParticipantsList";
import { FormatButton } from "@/components/ui/FormatButton";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { FormatterStatus } from "@/lib/format/useFormatterStatus";
import type { WorkspaceLayout } from "@/lib/workspace/layout";

export interface AppHeaderProps {
  onFormat: () => void;
  formatterStatus: FormatterStatus;
  room?: { status: ConnectionStatus; rejectedCode: number | null; participants: Participant[] };
  workspaceLayout: WorkspaceLayout;
  onWorkspaceLayoutChange: (layout: WorkspaceLayout) => void;
}

export function AppHeader({
  onFormat,
  formatterStatus,
  room,
  workspaceLayout,
  onWorkspaceLayoutChange,
}: AppHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-2">
      <span className="text-lg font-semibold text-foreground">txt4xyz</span>
      <ToggleGroup
        type="single"
        variant="outline"
        value={workspaceLayout}
        onValueChange={(value) => {
          if (value) onWorkspaceLayoutChange(value as WorkspaceLayout);
        }}
        aria-label="workspace layout"
      >
        <ToggleGroupItem value="editor" aria-label="editor only">
          Editor
        </ToggleGroupItem>
        <ToggleGroupItem value="split" aria-label="split view">
          Split
        </ToggleGroupItem>
        <ToggleGroupItem value="output" aria-label="output only">
          Output
        </ToggleGroupItem>
      </ToggleGroup>
      <div className="flex shrink-0 items-center gap-3">
        {room && <ParticipantsList room={room} />}
        <FormatButton onClick={onFormat} disabled={formatterStatus !== "ready"} />
        <SettingsButton onClick={() => setSettingsOpen(true)} />
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
