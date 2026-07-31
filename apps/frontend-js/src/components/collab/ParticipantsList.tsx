import {
  CLOSE_ROOM_FULL,
  CLOSE_AT_CAPACITY,
  CLOSE_INVALID_ROOM_ID,
  type ConnectionStatus,
} from "@/lib/collab/provider";
import type { Participant } from "@/lib/collab/useRoom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MAX_VISIBLE_AVATARS = 3;

const AVATAR_CLASS =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium";

// Purely decorative and purely local: which of the two alternating surface
// tones an avatar gets depends only on its position in this client's visible
// list, never on anything synced through awareness. Two peers can (and will)
// render the same participant in different tones.
const AVATAR_TONE_CLASS = [
  "bg-card text-card-foreground",
  "bg-secondary text-secondary-foreground",
];

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
          <span className="flex items-center -space-x-2">
            {visible.map((participant, index) => (
              <span
                key={participant.clientId}
                className={`${AVATAR_CLASS} ${AVATAR_TONE_CLASS[index % AVATAR_TONE_CLASS.length]}`}
              >
                {participant.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
            {hiddenCount > 0 && (
              <span
                className={`${AVATAR_CLASS} ${AVATAR_TONE_CLASS[visible.length % AVATAR_TONE_CLASS.length]}`}
              >
                +{hiddenCount}
              </span>
            )}
          </span>
        ) : (
          <ConnectingIndicator />
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto font-mono text-xs">
        {connected ? (
          <ul aria-label="participants" className="flex flex-col gap-1">
            {participants.map((participant) => (
              <li key={participant.clientId}>{participant.name}</li>
            ))}
          </ul>
        ) : (
          <p className="text-card-foreground/70">{label}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
