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

// Legible against the dark editor surface (oklch L≈0.24): kept in the
// L 0.72–0.8 / C 0.13–0.17 band so every entry reads clearly regardless of hue.
const PALETTE = [
  "oklch(0.78 0.15 25)",
  "oklch(0.78 0.14 60)",
  "oklch(0.75 0.16 100)",
  "oklch(0.8 0.13 145)",
  "oklch(0.78 0.13 190)",
  "oklch(0.78 0.14 230)",
  "oklch(0.76 0.16 280)",
  "oklch(0.78 0.16 330)",
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
