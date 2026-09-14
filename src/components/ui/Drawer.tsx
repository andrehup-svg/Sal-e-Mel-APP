"use client";

import { useEffect } from "react";

export function Drawer({
  open,
  onClose,
  children,
  widthClass = "sm:max-w-xs",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
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
      className="fixed inset-0 z-50 flex items-end bg-tinta/45 sm:items-center sm:justify-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-h-[85vh] animate-[drawer-up_0.25s_ease-out] overflow-y-auto rounded-t-card border border-borda bg-papel p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:animate-none sm:rounded-card sm:pb-6 ${widthClass}`}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-borda sm:hidden" />
        {children}
      </div>
    </div>
  );
}
