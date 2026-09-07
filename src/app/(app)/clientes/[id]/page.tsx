import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/lib/types";

type PedidoItem = { quantidade: number; produtos: { nome: string } | null };
type Pedido = {
  id: string;
  data_entrega: string | null;
  valor_total: number;
  sinal: number;
  restante: number;
  status_pagamento: string;
  status_entrega: string;
  venda_itens: PedidoItem[];
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatData(iso: string | null) {
  if (!iso) return "Sem data de entrega";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function itensResumo(pedido: Pedido) {
  if (pedido.venda_itens.length === 0) return "Sem itens";
  return pedido.venda_itens.map((i) => `${i.quantidade} ${i.produtos?.nome ?? "item"}`).join(" + ");
}

export default async function ClienteDetalhePage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: cliente } = await supabase.from("clientes").select("*").eq("id", id).single();

  if (!cliente) notFound();
  const c = cliente as Cliente;

  const { data: pedidosData } = await supabase
    .from("vendas")
    .select(
      "id, data_entrega, valor_total, sinal, restante, status_pagamento, status_entrega, venda_itens(quantidade, produtos(nome))",
    )
    .eq("cliente_id", id)
    .order("created_at", { ascending: false });

  const pedidos = (pedidosData ?? []) as unknown as Pedido[];

  return (
    <div>
      <Link href="/clientes" className="font-ui text-sm font-bold text-mel-700 hover:underline">
        ‹ Clientes
      </Link>
      <h1 className="mt-3 font-display text-[28px] text-tinta">{c.nome}</h1>
      <p className="mb-8 font-ui text-sm text-texto-suave">{c.telefone || "Sem telefone cadastrado"}</p>

      <h2 className="mb-3 font-ui text-sm font-extrabold text-texto-suave uppercase tracking-wide">
        Pedidos
      </h2>

      {pedidos.length === 0 ? (
        <p className="font-ui text-sm text-texto-medio">Nenhum pedido registrado ainda.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {pedidos.map((pedido) => (
            <div key={pedido.id} className="rounded-bloco border border-borda bg-papel px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-ui text-[15px] font-bold text-tinta">{itensResumo(pedido)}</p>
                  <p className="font-ui text-[13px] text-texto-suave">{formatData(pedido.data_entrega)}</p>
                </div>
                <div className="text-right">
                  <p className="font-ui text-[15px] font-bold text-tinta">
                    {formatBRL(pedido.valor_total)}
                  </p>
                  <p className="font-ui text-[13px] font-semibold text-texto-suave">
                    {pedido.status_pagamento === "Pago" ? "Pago" : `Falta ${formatBRL(pedido.restante)}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
