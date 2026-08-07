import { z } from "zod";
import { createPersistedSetting } from "@/lib/settings/createPersistedSetting";
import type { ExecutionMode } from "@txt4/core";

const executionModeSetting = createPersistedSetting<ExecutionMode>({
  key: "txt4xyz:execution-mode",
  schema: z.union([z.literal("run"), z.literal("debug")]),
  defaultValue: "run",
});

export const ExecutionModeProvider = executionModeSetting.Provider;

export function useExecutionMode(): { mode: ExecutionMode; setMode: (mode: ExecutionMode) => void } {
  const { value, setValue } = executionModeSetting.use();
  return { mode: value, setMode: (mode) => setValue(mode) };
}
