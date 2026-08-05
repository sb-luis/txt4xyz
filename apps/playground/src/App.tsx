import { IndexPage } from "./IndexPage";
import { LanguagePage } from "./LanguagePage";
import { languageByPath } from "./languages";
import { RouterProvider, usePath } from "./router";

function Routes() {
  const path = usePath();
  if (path === "/") return <IndexPage />;

  const entry = languageByPath(path);
  if (entry) return <LanguagePage key={entry.id} entry={entry} />;

  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
      <p className="text-sm text-slate-400">No page at {path}.</p>
    </div>
  );
}

export function App() {
  return (
    <RouterProvider>
      <Routes />
    </RouterProvider>
  );
}
