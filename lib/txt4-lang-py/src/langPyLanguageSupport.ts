import { python } from "@codemirror/lang-python";
import type { LanguageSupport } from "@codemirror/language";

export function langPySupport(): LanguageSupport {
  return python();
}
