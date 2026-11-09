"use client";

import { useEffect, useId } from "react";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, pending]);

  if (!open) return null;

  return (
    <div className="m-modal-scrim" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="m-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg tracking-tight">
          {title}
        </h2>
        <p className="m-muted mt-2 text-sm leading-relaxed">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={pending} className="m-btn-quiet">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={pending} className="m-btn">
            {pending ? "Working" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
