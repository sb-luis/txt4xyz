export type BackoffOptions = {
  baseMs: number;
  maxMs: number;
  factor: number;
};

export const defaultBackoffOptions: BackoffOptions = {
  baseMs: 300,
  maxMs: 15_000,
  factor: 2,
};

export function backoffDelay(
  attempt: number,
  random: () => number,
  options: BackoffOptions = defaultBackoffOptions,
): number {
  const raw = Math.min(options.maxMs, options.baseMs * options.factor ** attempt);
  return raw * (0.5 + random() * 0.5);
}
