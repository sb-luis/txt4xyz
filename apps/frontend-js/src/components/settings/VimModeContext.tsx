import { z } from "zod";
import { createPersistedSetting } from "@/lib/settings/createPersistedSetting";

const vimSetting = createPersistedSetting<boolean>({
  key: "txt4xyz:vim-mode",
  schema: z.boolean(),
  defaultValue: false,
});

export const VimModeProvider = vimSetting.Provider;

export function useVimMode(): { vimMode: boolean; toggleVimMode: () => void } {
  const { value, setValue } = vimSetting.use();
  return { vimMode: value, toggleVimMode: () => setValue(!value) };
}
