"use client";

import { useEffect, useState } from "react";

/** Animated confirm modal - a polished replacement for window.confirm(). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "warn";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Drive the enter/leave transition: mount hidden, then flip to visible next frame.
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!open) {
      setShow(false);
      return;
    }
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClass =
    tone === "warn"
      ? "bg-amber-500 text-black hover:bg-amber-400"
      : "bg-white text-black hover:bg-neutral-200";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${show ? "opacity-100" : "opacity-0"}`}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl transition-all duration-200 ${
          show ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-95 opacity-0"
        }`}
      >
        <h3 className="text-base font-semibold text-neutral-100">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-500"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
