import { SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SettingsButtonProps {
  onClick: () => void;
}

export function SettingsButton({ onClick }: SettingsButtonProps) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label="open settings">
      <SettingsIcon />
    </Button>
  );
}
