import { useState } from "react";
import { Input } from "@/components/ui/input";
import { MAX_ALIAS_LENGTH, isValidAlias, useAlias } from "@/components/settings/AliasContext";

export interface AliasFieldProps {
  id?: string;
}

export function AliasField({ id }: AliasFieldProps) {
  const { alias, setAlias } = useAlias();
  const [draft, setDraft] = useState(alias ?? "");
  const invalid = draft.length > 0 && !isValidAlias(draft);

  return (
    <div className="flex flex-col items-end gap-1">
      <Input
        id={id}
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (isValidAlias(next)) setAlias(next);
        }}
        maxLength={MAX_ALIAS_LENGTH}
        placeholder="your-alias"
        aria-label="alias"
        aria-invalid={invalid}
      />
      {invalid && (
        <span className="text-xs text-destructive">
          alphanumeric and hyphens only, up to {MAX_ALIAS_LENGTH} characters
        </span>
      )}
    </div>
  );
}
