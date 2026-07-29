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

// Monochrome by design (no per-participant hue): a spread of neutral
// lightnesses dark enough to hold 4.5:1 against the fixed light avatar-initial
// text (see AVATAR_CLASS), legible against each other and either app theme.
const PALETTE = [
  "oklch(0.28 0 0)",
  "oklch(0.34 0 0)",
  "oklch(0.4 0 0)",
  "oklch(0.46 0 0)",
  "oklch(0.52 0 0)",
];

export interface Identity {
  name: string;
  color: string;
  colorLight: string;
}

// Deliberately independent of the room id: the room id is a bearer credential
// and must never leak into a value that gets broadcast to every peer.
export function generateIdentity(random: () => number = Math.random): Identity {
  const adjective = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(random() * ANIMALS.length)];
  const color = PALETTE[Math.floor(random() * PALETTE.length)];
  return {
    name: `${adjective}-${animal}`,
    color,
    colorLight: `color-mix(in oklch, ${color} 30%, transparent)`,
  };
}
