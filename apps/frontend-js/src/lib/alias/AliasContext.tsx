import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { isValidAlias, readStoredAlias, writeStoredAlias } from "./alias";

interface AliasContextValue {
  // null means no custom alias has been set — the room's generated
  // placeholder name is used instead.
  alias: string | null;
  setAlias: (next: string) => boolean;
  clearAlias: () => void;
}

const AliasContext = createContext<AliasContextValue | null>(null);

export function AliasProvider({ children }: { children: ReactNode }) {
  const [alias, setAliasState] = useState<string | null>(readStoredAlias);

  const value = useMemo<AliasContextValue>(
    () => ({
      alias,
      setAlias: (next: string) => {
        if (!isValidAlias(next)) return false;
        writeStoredAlias(next);
        setAliasState(next);
        return true;
      },
      clearAlias: () => {
        writeStoredAlias(null);
        setAliasState(null);
      },
    }),
    [alias],
  );

  return <AliasContext.Provider value={value}>{children}</AliasContext.Provider>;
}

export function useAlias(): AliasContextValue {
  const value = useContext(AliasContext);
  if (value === null) throw new Error("useAlias must be used within an AliasProvider");
  return value;
}
