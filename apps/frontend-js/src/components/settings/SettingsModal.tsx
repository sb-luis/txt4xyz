import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AliasField } from "@/components/settings/AliasField";
import { ShortcutList } from "@/components/settings/ShortcutList";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { useVimMode } from "@/lib/vim/VimModeContext";

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { vimMode, toggleVimMode } = useVimMode();

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 text-sm">
          <section className="flex items-center justify-between gap-4">
            <Label htmlFor="alias-input">Alias</Label>
            <AliasField id="alias-input" />
          </section>
          <section>
            <Label className="mb-3">Shortcuts</Label>
            <ShortcutList />
          </section>
          <section className="flex items-center justify-between gap-4">
            <Label>Theme</Label>
            <ThemeSwitcher />
          </section>
          <section className="flex items-center justify-between gap-4">
            <Label htmlFor="vim-mode-switch">Vim keybindings</Label>
            <Switch
              id="vim-mode-switch"
              checked={vimMode}
              onCheckedChange={toggleVimMode}
              aria-label="toggle vim keybindings"
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
