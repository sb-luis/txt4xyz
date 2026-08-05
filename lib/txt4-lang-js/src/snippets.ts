import type { Snippet } from "@txt4/core";

export const langJsSnippets: Snippet[] = [
  {
    id: "happy-path",
    title: "Multi-step happy path",
    code: 'console.log("starting")\nlet x = 1 + 1\nconsole.log(x)\nconsole.log("done")',
  },
  {
    id: "error",
    title: "Throws partway through",
    code: 'console.log("starting")\nthrow new Error("something went wrong")\nconsole.log("unreachable")',
  },
  {
    id: "single-line",
    title: "Single line",
    code: 'console.log("hello")',
  },
  {
    id: "multi-arg-log",
    title: "Joins multiple log arguments",
    code: 'console.log("a", 1, "b")',
  },
  {
    id: "empty",
    title: "Empty program",
    code: "",
  },
];
