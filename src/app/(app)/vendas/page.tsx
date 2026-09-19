import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NovaVendaForm from "./NovaVendaForm";
import NovoOrcamentoForm from "./NovoOrcamentoForm";
import VendasModule from "./VendasModule";
import type { VendaComItens } from "./types";
import type { CategoriaPreco, Cliente, Produto } from "@/lib/types";

export default async function VendasPage() {
  const supabase = await createClient();

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [vendasRes, clientesRes, produtosRes, categoriasRes] = await Promise.all([
    supabase
      .from("vendas")
      .select(
        "id, cliente_id, data_entrega, valor_total, sinal, restante, status_pagamento, status_entrega, created_at, clientes(nome, telefone), venda_itens(produto_id, quantidade, modo_preco, produtos(nome))",
      )
      .order("created_at", { ascending: false }),
    supabase.from("clientes").select("*").order("nome"),
    supabase.from("produtos").select("*").order("nome"),
    supabase.from("categorias_preco").select("*").order("nome"),
  ]);

  const vendas = (vendasRes.data ?? []) as unknown as VendaComItens[];
  const clientes = (clientesRes.data ?? []) as Cliente[];
  const produtos = (produtosRes.data ?? []) as Produto[];
  const categorias = (categoriasRes.data ?? []) as CategoriaPreco[];

  const vendasDoMes = vendas.filter((v) => new Date(v.created_at) >= inicioMes);
  const previstoMes = vendasDoMes.reduce((acc, v) => acc + v.valor_total, 0);
  const recebidoMes = vendasDoMes.reduce(
    (acc, v) => acc + (v.status_pagamento === "Pago" ? v.valor_total : v.sinal),
    0,
  );

  const podeVender = produtos.length > 0 && clientes.length > 0;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-[32px] text-tinta">Vendas</h1>
        {podeVender && (
          <div className="flex gap-3">
            <NovoOrcamentoForm clientes={clientes} produtos={produtos} categorias={categorias} />
            <NovaVendaForm clientes={clientes} produtos={produtos} categorias={categorias} />
          </div>
        )}
      </div>
      {!podeVender && (
        <div className="mb-6 rounded-card border-2 border-dashed border-mel-500 bg-mel-100 p-6">
          <p className="font-ui text-sm text-texto-medio">
            Cadastre pelo menos um{" "}
            {produtos.length === 0 && (
              <Link href="/produtos" className="font-bold text-mel-700 underline">
                produto
              </Link>
            )}
            {produtos.length === 0 && clientes.length === 0 && " e um "}
            {clientes.length === 0 && (
              <Link href="/clientes" className="font-bold text-mel-700 underline">
                cliente
              </Link>
            )}{" "}
            antes de registrar uma venda.
          </p>
        </div>
      )}
      <VendasModule
        vendas={vendas}
        recebidoMes={recebidoMes}
        previstoMes={previstoMes}
        clientes={clientes}
        produtos={produtos}
        categorias={categorias}
      />
    </div>
  );
}
