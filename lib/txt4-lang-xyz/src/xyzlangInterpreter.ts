import type { ExecutionOutcome } from "@txt4/core";

export type XyzOutput = { kind: "log"; text: string };

// xyzlang is deliberately not a real language — just enough surface to
// exercise multi-line output-per-step and an error/halt path:
//   print <string-or-number-literal>   emits one output for this line
//   let <ident> = <literal>            binds a name, no evaluation
//   print <ident>                      emits the bound value
//   fail <string-literal>              raises an error at this line, halts
// Blank lines and `//` comments are skipped but still consume a line number.
export function interpretXyzlang(code: string): ExecutionOutcome<XyzOutput> {
  const bindings = new Map<string, string>();
  const steps: ExecutionOutcome<XyzOutput>["steps"] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const raw = lines[i].trim();

    if (raw === "" || raw.startsWith("//")) continue;

    const printMatch = raw.match(/^print\s+(.+)$/);
    const letMatch = raw.match(/^let\s+(\w+)\s*=\s*(.+)$/);
    const failMatch = raw.match(/^fail\s+(.+)$/);

    if (printMatch) {
      const value = resolveLiteralOrIdent(printMatch[1], bindings);
      steps.push({ line: lineNumber, outputs: [{ kind: "log", text: value }] });
      continue;
    }

    if (letMatch) {
      const [, ident, literal] = letMatch;
      bindings.set(ident, unquote(literal.trim()));
      steps.push({ line: lineNumber, outputs: [] });
      continue;
    }

    if (failMatch) {
      steps.push({ line: lineNumber, outputs: [] });
      return { steps, error: unquote(failMatch[1].trim()) };
    }

    steps.push({ line: lineNumber, outputs: [] });
  }

  return { steps, error: null };
}

function resolveLiteralOrIdent(token: string, bindings: Map<string, string>): string {
  const trimmed = token.trim();
  if (bindings.has(trimmed)) return bindings.get(trimmed)!;
  return unquote(trimmed);
}

function unquote(literal: string): string {
  if (literal.startsWith('"') && literal.endsWith('"')) return literal.slice(1, -1);
  return literal;
}
