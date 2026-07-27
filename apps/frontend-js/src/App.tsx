import { AppShell } from "@/components/layout/AppShell";
import { Homepage } from "@/components/home/Homepage";
import { currentRoute } from "@/lib/routing/route";

function App() {
  return currentRoute() === "edit" ? <AppShell /> : <Homepage />;
}

export default App;
