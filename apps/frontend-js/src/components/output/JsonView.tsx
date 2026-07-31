export interface JsonViewProps {
  value: unknown;
}

export function JsonView({ value }: JsonViewProps) {
  return (
    <pre className="max-h-80 overflow-auto border border-border px-2 py-1 font-mono text-sm text-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
