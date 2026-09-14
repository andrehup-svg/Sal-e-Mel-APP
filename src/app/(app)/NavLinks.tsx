"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";

const LINKS = [
  { href: "/vendas", label: "Vendas" },
  { href: "/compras", label: "Compras" },
  { href: "/produtos", label: "Produtos" },
  { href: "/clientes", label: "Clientes" },
];

export default function NavLinks({ sair }: { sair: () => Promise<void> }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <nav className="hidden min-w-0 flex-1 gap-1 sm:ml-2 sm:flex">
        {LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-full px-4 py-2 font-ui text-sm font-extrabold whitespace-nowrap no-underline ${
                active ? "bg-mel-500 text-tinta" : "text-texto-medio hover:bg-mel-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <form action={sair} className="ml-auto hidden shrink-0 sm:block">
        <button className="font-ui text-sm font-bold text-texto-medio hover:text-cacau-600">
          Sair
        </button>
      </form>

      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Abrir menu"
        className="ml-auto flex shrink-0 items-center justify-center rounded-full p-2.5 text-tinta hover:bg-mel-100 sm:hidden"
      >
        <span className="flex flex-col gap-[4px]">
          <span className="h-0.5 w-5 rounded-full bg-tinta" />
          <span className="h-0.5 w-5 rounded-full bg-tinta" />
          <span className="h-0.5 w-5 rounded-full bg-tinta" />
        </span>
      </button>

      <Drawer open={aberto} onClose={() => setAberto(false)} widthClass="sm:max-w-xs">
        <div className="flex flex-col divide-y divide-borda overflow-hidden rounded-bloco border border-borda">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setAberto(false)}
                className={`px-4 py-3.5 text-left font-ui text-[15px] font-bold no-underline ${
                  active ? "bg-mel-100 text-tinta" : "text-tinta hover:bg-mel-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <form action={sair} className="mt-3">
          <button className="w-full rounded-bloco border border-borda px-4 py-3.5 text-center font-ui text-[15px] font-bold text-texto-medio hover:bg-mel-100">
            Sair
          </button>
        </form>
      </Drawer>
    </>
  );
}
