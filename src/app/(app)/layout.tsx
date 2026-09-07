import Image from "next/image";
import { sair } from "@/app/actions";
import NavLinks from "./NavLinks";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col bg-creme">
      <header className="border-b border-borda bg-papel">
        <div className="mx-auto flex max-w-[1080px] items-center gap-4 px-6 py-3">
          <Image
            src="/sal-e-mel-logo.jpg"
            alt="Sal e Mel"
            width={44}
            height={44}
            className="rounded-[10px] object-cover"
          />
          <span className="font-display text-[22px] text-tinta">Sal e Mel</span>
          <NavLinks />
          <form action={sair} className="ml-auto">
            <button className="font-ui text-sm font-bold text-texto-medio hover:text-cacau-600">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-[1080px] px-6 py-9">{children}</div>
      </main>
    </div>
  );
}
