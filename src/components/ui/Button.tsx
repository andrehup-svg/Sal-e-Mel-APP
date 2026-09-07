import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-mel-500 text-tinta shadow-btn-primario hover:bg-mel-400 active:translate-y-0.5 active:shadow-none disabled:bg-desabilitado-bg disabled:text-desabilitado-fg disabled:shadow-none",
  secondary:
    "bg-cacau-600 text-papel shadow-btn-secundario hover:bg-[#7D4B2C] active:translate-y-0.5 active:shadow-none disabled:bg-desabilitado-bg disabled:text-desabilitado-fg disabled:shadow-none",
  outline:
    "bg-transparent text-cacau-600 border-2 border-cacau-600 hover:bg-mel-100 disabled:border-desabilitado-fg disabled:text-desabilitado-fg",
  ghost:
    "bg-transparent text-mel-700 hover:bg-mel-100 disabled:text-desabilitado-fg",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-9 px-[18px] text-sm",
  md: "h-12 px-7 text-base",
  lg: "h-14 px-9 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={`font-ui font-extrabold rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    />
  );
}
