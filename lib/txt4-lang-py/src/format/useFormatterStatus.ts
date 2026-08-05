import { useEffect, useState } from "react";
import { ensureFormatterReady } from "./ruffFormatter";

export type FormatterStatus = "loading" | "ready" | "error";

export function useFormatterStatus(): FormatterStatus {
  const [status, setStatus] = useState<FormatterStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    ensureFormatterReady()
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
