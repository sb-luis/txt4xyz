export type Route = "home" | "edit" | "offline";

export function resolveRoute(pathname: string): Route {
  if (pathname === "/edit") return "edit";
  if (pathname === "/offline") return "offline";
  return "home";
}

export function currentRoute(): Route {
  return resolveRoute(window.location.pathname);
}
