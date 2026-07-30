import { Modal } from "@/components/ui/Modal";
import { ShortcutList } from "@/components/settings/ShortcutList";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="flex flex-col gap-4">
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
      </div>
    </Modal>
  );
}
