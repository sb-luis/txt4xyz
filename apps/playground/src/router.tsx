import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

function getPath(): string {
  return window.location.pathname;
}

const PathContext = createContext<string | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(getPath());

  useEffect(() => {
    const onPopState = () => setPath(getPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return <PathContext.Provider value={path}>{children}</PathContext.Provider>;
}

export function usePath(): string {
  const path = useContext(PathContext);
  if (path === null) throw new Error("usePath must be used within a RouterProvider");
  return path;
}

export function navigate(to: string) {
  if (to === window.location.pathname + window.location.search) return;
  window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
