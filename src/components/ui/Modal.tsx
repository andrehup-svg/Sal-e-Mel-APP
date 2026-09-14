"use client";

import { useEffect } from "react";

export function Modal({
  open,
  onClose,
  children,
  widthClass = "max-w-md",
  closeOnBackdropClick = true,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
  closeOnBackdropClick?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/45 p-4"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${widthClass} max-h-[85vh] overflow-y-auto rounded-card border border-borda bg-papel p-6`}
      >
        {children}
      </div>
    </div>
  );
}
