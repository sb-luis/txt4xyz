import { describe, expect, it } from "vitest";
import { LanguageSupport } from "@codemirror/language";
import { langPySupport } from "./langPyLanguageSupport";

describe("langPySupport", () => {
  it("returns a Python LanguageSupport that parses def statements", () => {
    const support = langPySupport();
    expect(support).toBeInstanceOf(LanguageSupport);
    expect(support.language.name).toBe("python");

    const tree = support.language.parser.parse("def foo():\n    return 1\n");
    const nodeNames = new Set<string>();
    tree.iterate({
      enter: (node) => {
        nodeNames.add(node.name);
      },
    });
    expect(nodeNames).toContain("FunctionDefinition");
  });
});
