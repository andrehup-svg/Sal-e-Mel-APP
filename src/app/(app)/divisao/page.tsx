import { createClient } from "@/lib/supabase/server";
import DivisaoModule, { type CompraDetalhe, type MesDivisao, type VendaDetalhe } from "./DivisaoModule";
import type { Compra, DivisaoStatusMensal, ParametrosDivisao, Venda } from "@/lib/types";
import {
  dividirLucro,
  hojeISOBrasil,
  mesDaCompra,
  mesDaVenda,
  mesReferencia,
  nomeMes,
  percentualDoMes,
  somaComprasDoMes,
  somaVendasDoMes,
} from "@/lib/lucro";

type VendaRow = Pick<Venda, "id" | "valor_total" | "restante" | "status_pagamento" | "created_at"> & {
  clientes: { nome: string } | null;
  venda_itens: { quantidade: number; produtos: { nome: string } | null }[];
};

type CompraRow = Pick<
  Compra,
  "id" | "fornecedor" | "item" | "valor" | "status" | "data_compra" | "numero_parcela" | "total_parcelas"
>;

function itensResumo(v: VendaRow) {
  if (v.venda_itens.length === 0) return "Sem itens";
  return v.venda_itens.map((i) => `${i.quantidade} ${i.produtos?.nome.toLowerCase() ?? "item"}`).join(" + ");
}

export default async function DivisaoPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const supabase = await createClient();
  const { mes: mesParam } = await searchParams;

  const mesAtual = mesReferencia(hojeISOBrasil());
  const mesSelecionado = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? `${mesParam}-01` : mesAtual;

  const [vendasRes, comprasRes, parametrosRes, statusRes] = await Promise.all([
    supabase
      .from("vendas")
      .select(
        "id, valor_total, restante, status_pagamento, created_at, clientes(nome), venda_itens(quantidade, produtos(nome))",
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("compras")
      .select("id, fornecedor, item, valor, status, data_compra, numero_parcela, total_parcelas")
      .order("data_compra", { ascending: true }),
    supabase.from("parametros_divisao").select("*").eq("id", 1).single(),
    supabase.from("divisao_status_mensal").select("*"),
  ]);

  const vendas = (vendasRes.data ?? []) as unknown as VendaRow[];
  const compras = (comprasRes.data ?? []) as CompraRow[];
  const percentualVigente = (parametrosRes.data as ParametrosDivisao | null)?.percentual_socia ?? 50;
  const statusPorMes = new Map(
    ((statusRes.data ?? []) as DivisaoStatusMensal[]).map((s) => [s.mes_referencia, s]),
  );

  function montarMes(mes: string): MesDivisao {
    const v = somaVendasDoMes(vendas, mes);
    const c = somaComprasDoMes(compras, mes);
    const status = statusPorMes.get(mes) ?? null;
    const percentualSocia = percentualDoMes(status, percentualVigente);
    const lucro = v.total - c.total;
    return {
      mes,
      label: nomeMes(mes),
      vendas: v.total,
      compras: c.total,
      lucro,
      percentualSocia,
      ...dividirLucro(lucro, percentualSocia),
      statusDono: status?.status_dono ?? "Ainda no caixa do negócio",
      dataRetirada: status?.data_retirada ?? null,
      statusSocia: status?.status_socia ?? "Pendente de repasse",
      dataRepasse: status?.data_repasse ?? null,
    };
  }

  // Histórico: todo mês com venda, compra ou status registrado, exceto o
  // mês atual (que já aparece nos cards do topo), do mais recente pro mais antigo.
  const meses = new Set<string>(statusPorMes.keys());
  for (const v of vendas) meses.add(mesDaVenda(v.created_at));
  for (const c of compras) {
    const m = mesDaCompra(c.data_compra);
    if (m) meses.add(m);
  }
  const historico = [...meses]
    .filter((m) => m < mesAtual)
    .sort()
    .reverse()
    .map(montarMes);

  const vendasDetalhe: VendaDetalhe[] = somaVendasDoMes(vendas, mesSelecionado).lista.map((v) => ({
    id: v.id,
    cliente: v.clientes?.nome ?? "Cliente removido",
    itens: itensResumo(v),
    valor: v.valor_total,
    pago: v.status_pagamento === "Pago",
    restante: v.restante,
  }));

  const comprasDetalhe: CompraDetalhe[] = somaComprasDoMes(compras, mesSelecionado).lista.map((c) => ({
    id: c.id,
    fornecedor: c.fornecedor,
    item:
      c.total_parcelas > 1
        ? [c.item, `Parcela ${c.numero_parcela}/${c.total_parcelas}`].filter(Boolean).join(" · ")
        : c.item,
    valor: c.valor,
    pago: c.status === "Pago",
  }));

  return (
    <DivisaoModule
      atual={montarMes(mesSelecionado)}
      ehMesAtual={mesSelecionado === mesAtual}
      percentualVigente={percentualVigente}
      vendasDetalhe={vendasDetalhe}
      comprasDetalhe={comprasDetalhe}
      historico={historico}
    />
  );
}
