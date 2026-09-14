import Image from "next/image";
import Link from "next/link";
import { sair } from "@/app/actions";
import NavLinks from "./NavLinks";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col bg-creme">
      <header className="border-b border-borda bg-papel">
        <div className="mx-auto flex max-w-[1080px] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <Link href="/painel" className="flex shrink-0 items-center gap-2">
            <Image
              src="/sal-e-mel-logo.jpg"
              alt="Sal e Mel"
              width={44}
              height={44}
              className="rounded-[10px] object-cover"
            />
            <span className="hidden font-display text-[22px] whitespace-nowrap text-tinta sm:inline">
              Sal e Mel
            </span>
          </Link>
          <NavLinks sair={sair} />
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-[1080px] px-6 py-9">{children}</div>
      </main>
    </div>
  );
}
