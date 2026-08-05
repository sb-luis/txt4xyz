import { javascript } from "@codemirror/lang-javascript";
import type { LanguageSupport } from "@codemirror/language";

export function langJsSupport(): LanguageSupport {
  return javascript();
}
