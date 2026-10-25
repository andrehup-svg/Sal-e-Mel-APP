import { createClient } from "@/lib/supabase/server";
import EstoqueModule from "./EstoqueModule";
import type { ItemEstoque } from "@/lib/types";

export default async function EstoquePage() {
  const supabase = await createClient();
  const { data } = await supabase.from("estoque").select("*").order("nome");

  const itens = ((data ?? []) as ItemEstoque[]).map((i) => ({
    ...i,
    quantidade: Number(i.quantidade),
    minimo: Number(i.minimo),
  }));

  return (
    <div>
      <h1 className="mb-8 font-display text-[32px] text-tinta">Estoque</h1>
      <EstoqueModule itens={itens} />
    </div>
  );
}
