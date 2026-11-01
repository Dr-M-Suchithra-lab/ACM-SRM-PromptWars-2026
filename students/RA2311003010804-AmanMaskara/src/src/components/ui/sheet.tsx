"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "./button";

/**
 * Modal sheet on a native <dialog>: focus is trapped and Escape closes it for free.
 * It slides up from the bottom on phones and sits centred on laptops. Opening it is local
 * state, never a navigation, so the browser Back button is not affected.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const t = useTranslations("common");
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="sheet-panel m-0 mt-auto w-full max-w-none rounded-t-[28px] border border-line bg-surface p-0 text-ink shadow-[var(--shadow-lift)] backdrop:bg-ink/40 md:m-auto md:max-w-lg md:rounded-[28px]"
    >
      <div className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:p-7">
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-2xl leading-tight font-extrabold">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("close")}
            onClick={onClose}
            className="-mt-1 -mr-2 shrink-0"
          >
            <X aria-hidden="true" className="size-6" />
          </Button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
