export interface HtmlViewProps {
  html: string;
}

// `sandbox=""` (no allow-scripts, no allow-same-origin) — the iframe can run
// no scripts and cannot reach the parent DOM, since this markup is broadcast
// from peers and must be treated as untrusted regardless of its source.
export function HtmlView({ html }: HtmlViewProps) {
  return (
    <iframe
      srcDoc={html}
      sandbox=""
      title="rich output"
      className="max-h-80 w-full border border-app-border bg-white"
    />
  );
}
