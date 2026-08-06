import { z } from "zod";
import { createPersistedSetting } from "@/lib/settings/createPersistedSetting";

export const MAX_ALIAS_LENGTH = 24;

const ALIAS_PATTERN = /^[a-zA-Z0-9-]+$/;

export function isValidAlias(value: string): boolean {
  return value.length > 0 && value.length <= MAX_ALIAS_LENGTH && ALIAS_PATTERN.test(value);
}

const aliasSetting = createPersistedSetting<string | null>({
  key: "txt4xyz:alias",
  schema: z.union([z.string().refine(isValidAlias), z.null()]),
  defaultValue: null,
});

export const AliasProvider = aliasSetting.Provider;

export interface AliasContextValue {
  // null means no custom alias has been set — the room's generated
  // placeholder name is used instead.
  alias: string | null;
  setAlias: (next: string) => boolean;
  clearAlias: () => void;
}

export function useAlias(): AliasContextValue {
  const { value, setValue } = aliasSetting.use();
  return {
    alias: value,
    setAlias: (next: string) => setValue(next),
    clearAlias: () => {
      setValue(null);
    },
  };
}
