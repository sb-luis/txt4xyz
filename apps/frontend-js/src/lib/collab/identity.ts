const ADJECTIVES = [
  "swift",
  "quiet",
  "amber",
  "brave",
  "lucky",
  "clever",
  "gentle",
  "bold",
  "sunny",
  "wandering",
  "curious",
  "quick",
];

const ANIMALS = [
  "otter",
  "falcon",
  "lynx",
  "heron",
  "badger",
  "fox",
  "sparrow",
  "wren",
  "marten",
  "gecko",
  "orca",
  "ibis",
];

// gruvbox bright accents — used to color a peer's remote cursor/selection so
// collaborators are visually distinguishable instead of falling back to
// y-codemirror.next's hardcoded default (#30bced for every peer).
const CURSOR_COLORS = [
  "#fb4934", // bright red
  "#b8bb26", // bright green
  "#fabd2f", // bright yellow
  "#83a598", // bright blue
  "#d3869b", // bright purple
  "#8ec07c", // bright aqua
  "#fe8019", // bright orange
];

export interface Identity {
  name: string;
  color: string;
}

// Deliberately independent of the room id: the room id is a bearer credential
// and must never leak into a value that gets broadcast to every peer. Name and
// color are the only identity broadcast — avatar styling is a purely local,
// decorative concern (see ParticipantsList) and is never synced.
export function generateIdentity(random: () => number = Math.random): Identity {
  const adjective = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(random() * ANIMALS.length)];
  const color = CURSOR_COLORS[Math.floor(random() * CURSOR_COLORS.length)];
  return {
    name: `${adjective}-${animal}`,
    color,
  };
}
