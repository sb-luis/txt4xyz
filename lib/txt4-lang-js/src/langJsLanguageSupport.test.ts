import { describe, expect, it } from "vitest";
import { LanguageSupport } from "@codemirror/language";
import { langJsSupport } from "./langJsLanguageSupport";

describe("langJsSupport", () => {
  it("returns a JavaScript LanguageSupport that parses function declarations", () => {
    const support = langJsSupport();
    expect(support).toBeInstanceOf(LanguageSupport);
    expect(support.language.name).toBe("javascript");

    const tree = support.language.parser.parse("function foo() {\n  return 1;\n}\n");
    const nodeNames = new Set<string>();
    tree.iterate({
      enter: (node) => {
        nodeNames.add(node.name);
      },
    });
    expect(nodeNames).toContain("FunctionDeclaration");
  });
});
