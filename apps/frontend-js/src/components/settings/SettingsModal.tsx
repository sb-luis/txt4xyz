import { Modal } from "@/components/ui/Modal";
import { AliasField } from "@/components/settings/AliasField";
import { ShortcutList } from "@/components/settings/ShortcutList";
import { Switch } from "@/components/ui/Switch";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { useVimMode } from "@/lib/vim/VimModeContext";

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { vimMode, toggleVimMode } = useVimMode();

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="flex flex-col gap-4">
        <section className="flex items-center justify-between gap-4">
          <h3 className="text-xs uppercase tracking-wide text-app-fg/70">Alias</h3>
          <AliasField />
        </section>
        <section>
          <h3 className="mb-1.5 text-xs uppercase tracking-wide text-app-fg/70">
            Shortcuts
          </h3>
          <ShortcutList />
        </section>
        <section className="flex items-center justify-between gap-4">
          <h3 className="text-xs uppercase tracking-wide text-app-fg/70">Theme</h3>
          <ThemeSwitcher />
        </section>
        <section className="flex items-center justify-between gap-4">
          <h3 className="text-xs uppercase tracking-wide text-app-fg/70">Vim keybindings</h3>
          <Switch checked={vimMode} onChange={toggleVimMode} aria-label="toggle vim keybindings" />
        </section>
      </div>
    </Modal>
  );
}
