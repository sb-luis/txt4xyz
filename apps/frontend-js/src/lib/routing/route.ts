export type Route = "home" | "edit";

export function resolveRoute(pathname: string): Route {
  return pathname === "/edit" ? "edit" : "home";
}

export function currentRoute(): Route {
  return resolveRoute(window.location.pathname);
}
