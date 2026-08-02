import { AppShell } from "@/components/layout/AppShell";
import { Homepage } from "@/components/home/Homepage";
import { currentRoute } from "@/lib/routing/route";

function App() {
  const route = currentRoute();
  if (route === "edit") return <AppShell mode="collab" />;
  if (route === "offline") return <AppShell mode="offline" />;
  return <Homepage />;
}

export default App;
