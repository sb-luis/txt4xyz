import type { Snippet } from "@txt4/core";

export const langPySnippets: Snippet[] = [
  {
    id: "stdout",
    title: "Plain stdout",
    code: 'print("starting")\nx = 1 + 1\nprint(x)\nprint("done")',
  },
  {
    id: "error",
    title: "Raises an unhandled error",
    code: 'print("starting")\nraise ValueError("something went wrong")',
  },
  {
    id: "dataframe",
    title: "Displays a pandas dataframe",
    code: "import pandas as pd\ndf = pd.DataFrame({'a': range(10)})\ndisplay(df)",
  },
];
