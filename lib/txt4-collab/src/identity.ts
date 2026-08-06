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

// gruvbox bright accents, used so peers get distinct cursor colors instead of y-codemirror.next's default (#30bced for everyone).
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

// Deliberately independent of the room id: the room id is a bearer credential and must never be broadcast to peers.
export function generateIdentity(random: () => number = Math.random): Identity {
  const adjective = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(random() * ANIMALS.length)];
  const color = CURSOR_COLORS[Math.floor(random() * CURSOR_COLORS.length)];
  return {
    name: `${adjective}-${animal}`,
    color,
  };
}
