import { WandSparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FormatButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function FormatButton({ onClick, disabled }: FormatButtonProps) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} disabled={disabled} aria-label="format code">
      <WandSparklesIcon />
    </Button>
  );
}
