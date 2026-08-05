import type { ExecutionRunner } from "@txt4/core";
import { interpretXyzlang, type XyzOutput } from "./xyzlangInterpreter";

export const xyzlangRunner: ExecutionRunner<XyzOutput> = {
  async run(code) {
    return interpretXyzlang(code);
  },
};
