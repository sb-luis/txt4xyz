import { languages } from "./languages";
import { navigate } from "./router";

export function IndexPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">txt4 playground</h1>
        <ul className="flex flex-col gap-2">
          {languages.map((lang) => (
            <li key={lang.id}>
              <button
                onClick={() => navigate(lang.path)}
                className="w-64 rounded border border-slate-700 bg-slate-900 px-4 py-2 text-left text-sm hover:bg-slate-800"
              >
                {lang.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
