"use client";

import type { InputHTMLAttributes } from "react";

function formatBRLCents(v: number) {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MoneyInput({
  value,
  onChange,
  className = "",
  ...rest
}: {
  value: number;
  onChange: (reais: number) => void;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={formatBRLCents(value)}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const digitos = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
        const reais = parseInt(digitos || "0", 10) / 100;
        onChange(reais);
      }}
      className={`w-full rounded-input border-2 border-borda bg-white px-4 py-[13px] font-ui text-base text-tinta outline-none transition-colors focus:border-mel-500 ${className}`}
      {...rest}
    />
  );
}
