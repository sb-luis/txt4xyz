import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AliasField } from "@/components/settings/AliasField";
import { ShortcutList } from "@/components/settings/ShortcutList";
import { SectionLabel, sectionLabelClassName } from "@/components/ui/section-label";
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
      <DialogContent className="max-w-sm font-mono">
        <DialogHeader>
          <DialogTitle className={sectionLabelClassName}>Settings</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <section className="flex items-center justify-between gap-4">
            <SectionLabel>Alias</SectionLabel>
            <AliasField />
          </section>
          <section>
            <SectionLabel className="mb-1.5">Shortcuts</SectionLabel>
            <ShortcutList />
          </section>
          <section className="flex items-center justify-between gap-4">
            <SectionLabel>Theme</SectionLabel>
            <ThemeSwitcher />
          </section>
          <section className="flex items-center justify-between gap-4">
            <SectionLabel>Vim keybindings</SectionLabel>
            <Switch
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
