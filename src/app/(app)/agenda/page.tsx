import { createClient } from "@/lib/supabase/server";
import AgendaModule from "./AgendaModule";
import type { VendaComItens } from "../vendas/types";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AgendaPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("vendas")
    .select(
      "id, cliente_id, data_entrega, valor_total, sinal, restante, status_pagamento, status_entrega, created_at, clientes(nome, telefone), venda_itens(produto_id, quantidade, modo_preco, valor_item, valor_manual, produtos(nome))",
    )
    .not("data_entrega", "is", null)
    .order("data_entrega", { ascending: true });

  const vendas = (data ?? []) as unknown as VendaComItens[];

  return (
    <div>
      <h1 className="mb-8 font-display text-[32px] text-tinta">Agenda de entregas</h1>
      <AgendaModule vendas={vendas} hojeISO={toISODate(new Date())} />
    </div>
  );
}
