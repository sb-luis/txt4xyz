import {
  CLOSE_ROOM_FULL,
  CLOSE_AT_CAPACITY,
  CLOSE_INVALID_ROOM_ID,
  type ConnectionStatus,
} from "@/lib/collab/provider";
import type { Participant } from "@/lib/collab/useRoom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";

const MAX_VISIBLE_AVATARS = 3;

const ROOM_STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: "connecting…",
  connected: "connected",
  disconnected: "disconnected",
  rejected: "room unavailable",
};

const REJECTED_CODE_LABEL: Record<number, string> = {
  [CLOSE_ROOM_FULL]: "room is full",
  [CLOSE_AT_CAPACITY]: "server at capacity",
  [CLOSE_INVALID_ROOM_ID]: "invalid room link",
};

function roomStatusLabel(status: ConnectionStatus, rejectedCode: number | null): string {
  if (status === "rejected" && rejectedCode !== null) {
    return REJECTED_CODE_LABEL[rejectedCode] ?? ROOM_STATUS_LABEL.rejected;
  }
  return ROOM_STATUS_LABEL[status];
}

const BOUNCE_DELAYS_MS = [0, 150, 300];

function ConnectingIndicator() {
  return (
    <span aria-hidden className="flex items-center gap-0.5">
      {BOUNCE_DELAYS_MS.map((delay) => (
        <span
          key={delay}
          className="h-1 w-1 animate-bounce rounded-full bg-foreground/50"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

export interface ParticipantsListProps {
  room: { status: ConnectionStatus; rejectedCode: number | null; participants: Participant[] };
}

export function ParticipantsList({ room }: ParticipantsListProps) {
  const { status, rejectedCode, participants } = room;
  const visible = participants.slice(0, MAX_VISIBLE_AVATARS);
  const hiddenCount = participants.length - visible.length;
  const label = roomStatusLabel(status, rejectedCode);
  const connected = status === "connected";

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`room: ${label}`}
        className="flex cursor-pointer items-center"
      >
        {connected ? (
          <AvatarGroup>
            {visible.map((participant) => (
              <Avatar key={participant.clientId}>
                <AvatarFallback>
                  {participant.name.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {hiddenCount > 0 && (
              <AvatarGroupCount>+{hiddenCount}</AvatarGroupCount>
            )}
          </AvatarGroup>
        ) : (
          <ConnectingIndicator />
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto text-sm">
        {connected ? (
          <ul aria-label="participants" className="flex flex-col gap-1">
            {participants.map((participant) => (
              <li key={participant.clientId}>{participant.name}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{label}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
