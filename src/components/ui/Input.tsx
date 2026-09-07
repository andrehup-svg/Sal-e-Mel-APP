import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }
>(function Input({ className = "", hasError = false, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-input border-2 bg-white px-4 py-[13px] font-ui text-base text-tinta outline-none transition-colors ${
        hasError ? "border-erro" : "border-borda focus:border-mel-500"
      } ${className}`}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", ...props }, ref) {
    return (
      <select
        ref={ref}
        className={`w-full rounded-input border-2 border-borda bg-white px-4 py-[13px] font-ui text-base text-tinta outline-none transition-colors focus:border-mel-500 ${className}`}
        {...props}
      />
    );
  },
);

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-[7px]">
      <span className="font-ui text-sm font-extrabold text-tinta">{label}</span>
      {children}
      {error && <span className="font-ui text-[13px] font-semibold text-erro">{error}</span>}
    </label>
  );
}
