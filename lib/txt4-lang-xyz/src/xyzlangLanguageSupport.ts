import { LanguageSupport, StreamLanguage } from "@codemirror/language";

const KEYWORDS = new Set(["print", "let", "fail"]);

const xyzlangStreamParser = StreamLanguage.define<{ afterKeyword: boolean }>({
  startState() {
    return { afterKeyword: false };
  },
  token(stream, state) {
    if (stream.eatSpace()) return null;

    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }

    if (stream.match(/^"[^"]*"/)) return "string";
    if (stream.match(/^\d+/)) return "number";

    if (stream.match(/^\w+/)) {
      const text = stream.current();
      if (KEYWORDS.has(text)) {
        state.afterKeyword = true;
        return "keyword";
      }
      return state.afterKeyword ? "variableName" : "variableName.definition";
    }

    stream.next();
    return null;
  },
});

export function xyzlang(): LanguageSupport {
  return new LanguageSupport(xyzlangStreamParser);
}
