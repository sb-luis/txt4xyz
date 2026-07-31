import { z } from "zod";

export const runRequestSchema = z.object({
  type: z.literal("run"),
  id: z.string(),
  code: z.string(),
});
export type RunRequest = z.infer<typeof runRequestSchema>;

export const mainToWorkerMessageSchema = runRequestSchema;
export type MainToWorkerMessage = z.infer<typeof mainToWorkerMessageSchema>;

export const readyMessageSchema = z.object({
  type: z.literal("ready"),
});

export const stdoutMessageSchema = z.object({
  type: z.literal("stdout"),
  id: z.string(),
  line: z.string(),
});

export const stderrMessageSchema = z.object({
  type: z.literal("stderr"),
  id: z.string(),
  line: z.string(),
});

export const runResultMessageSchema = z.object({
  type: z.literal("run-result"),
  id: z.string(),
});

export const runErrorMessageSchema = z.object({
  type: z.literal("run-error"),
  id: z.string(),
  traceback: z.string(),
});

export const initFailureMessageSchema = z.object({
  type: z.literal("init-failure"),
  message: z.string(),
});

export const dataframeDisplaySchema = z.object({
  kind: z.literal("dataframe"),
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  rowCount: z.number(),
  truncated: z.boolean(),
});

export const plotDisplaySchema = z.object({
  kind: z.literal("plot"),
  svg: z.string(),
});

export const htmlDisplaySchema = z.object({
  kind: z.literal("html"),
  html: z.string(),
});

export const imageDisplaySchema = z.object({
  kind: z.literal("image"),
  mime: z.string(),
  dataBase64: z.string(),
});

export const jsonDisplaySchema = z.object({
  kind: z.literal("json"),
  value: z.unknown(),
});

export const displayPayloadSchema = z.discriminatedUnion("kind", [
  dataframeDisplaySchema,
  plotDisplaySchema,
  htmlDisplaySchema,
  imageDisplaySchema,
  jsonDisplaySchema,
]);
export type DisplayPayload = z.infer<typeof displayPayloadSchema>;

export const displayMessageSchema = z.object({
  type: z.literal("display"),
  id: z.string(),
  display: displayPayloadSchema,
});

export const workerToMainMessageSchema = z.discriminatedUnion("type", [
  readyMessageSchema,
  stdoutMessageSchema,
  stderrMessageSchema,
  runResultMessageSchema,
  runErrorMessageSchema,
  initFailureMessageSchema,
  displayMessageSchema,
]);
export type WorkerToMainMessage = z.infer<typeof workerToMainMessageSchema>;

export function parseWorkerToMainMessage(data: unknown): WorkerToMainMessage {
  return workerToMainMessageSchema.parse(data);
}

export function parseMainToWorkerMessage(data: unknown): MainToWorkerMessage {
  return mainToWorkerMessageSchema.parse(data);
}
