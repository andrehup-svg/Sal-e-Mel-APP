"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/produtos", label: "Produtos" },
  { href: "/clientes", label: "Clientes" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="ml-4 flex gap-1">
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-4 py-2 font-ui text-sm font-extrabold no-underline ${
              active ? "bg-mel-500 text-tinta" : "text-texto-medio hover:bg-mel-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
