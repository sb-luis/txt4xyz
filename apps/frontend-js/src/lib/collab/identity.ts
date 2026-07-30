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

export interface Identity {
  name: string;
}

// Deliberately independent of the room id: the room id is a bearer credential
// and must never leak into a value that gets broadcast to every peer. Name is
// the only identity broadcast — avatar styling is a purely local, decorative
// concern (see ParticipantsList) and is never synced.
export function generateIdentity(random: () => number = Math.random): Identity {
  const adjective = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(random() * ANIMALS.length)];
  return {
    name: `${adjective}-${animal}`,
  };
}
