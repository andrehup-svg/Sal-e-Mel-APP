import { createClient } from "@/lib/supabase/server";
import ComprasModule, {
  type CompraRow,
  type FaturaAberta,
  type FaturaPagaRow,
  type ProximaCompra,
} from "./ComprasModule";
import NovaCompraForm from "./NovaCompraForm";
import type { Cartao, Compra, FaturaPaga, Venda } from "@/lib/types";
import {
  formatDataBR,
  formatDataISOBR,
  formatMesAnoBR,
  primeiroDiaMes,
  proximoVencimento,
  toISODate,
  vencimentoDaCompetencia,
} from "@/lib/faturas";

function parcelaLabel(c: Compra) {
  return c.total_parcelas > 1 ? `Parcela ${c.numero_parcela}/${c.total_parcelas}` : null;
}

// "Cartão · Nubank" só faz sentido pra distinguir QUAL cartão quando há mais
// de um cadastrado; com um só, repetir o nome (ainda mais quando o cartão se
// chama justamente "Cartão") não agrega nada.
function toCompraRow(c: Compra & { cartoes: { nome: string } | null }, totalCartoes: number): CompraRow {
  const pagamentoLabel =
    c.forma_pagamento === "pix"
      ? "Pix"
      : totalCartoes > 1
        ? `Cartão · ${c.cartoes?.nome ?? ""}`
        : "Cartão";

  return {
    id: c.id,
    fornecedor: c.fornecedor,
    item: c.item,
    valor: c.valor,
    pagamentoLabel,
    status: c.status,
    parcelaLabel: parcelaLabel(c),
    dataCompraISO: c.data_compra,
    podeEditar: podeEditar(c),
    podeExcluir: podeExcluir(c),
  };
}

// Uma vez que a fatura do cartão foi paga, a linha vira histórico —
// não pode mais ser editada nem excluída. Pix e "Na fatura" seguem livres.
function podeExcluir(c: Compra) {
  return !(c.forma_pagamento === "cartao" && c.status === "Pago");
}

// Parceladas não são editáveis (mudar 1 parcela quebraria a soma do total) —
// só dá pra excluir e lançar de novo.
function podeEditar(c: Compra) {
  return c.total_parcelas === 1 && podeExcluir(c);
}

export default async function ComprasPage() {
  const supabase = await createClient();

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const hojeISO = toISODate(hoje);

  const [comprasRes, cartoesRes, faturasPagasRes, vendasRes] = await Promise.all([
    supabase
      .from("compras")
      .select("*, cartoes(nome)")
      .order("created_at", { ascending: false }),
    supabase.from("cartoes").select("*"),
    supabase
      .from("faturas_pagas")
      .select("*, cartoes(nome)")
      .order("data_pagamento", { ascending: false }),
    supabase.from("vendas").select("id, valor_total, sinal, restante, status_pagamento, data_entrega"),
  ]);

  const cartoes = (cartoesRes.data ?? []) as Cartao[];
  const vendas = (vendasRes.data ?? []) as Pick<
    Venda,
    "id" | "valor_total" | "sinal" | "restante" | "status_pagamento" | "data_entrega"
  >[];
  const comprasData = (comprasRes.data ?? []) as (Compra & { cartoes: { nome: string } | null })[];
  const faturasPagasData = (faturasPagasRes.data ?? []) as (FaturaPaga & {
    cartoes: { nome: string } | null;
  })[];

  const competenciaAtualISO = toISODate(inicioMes);

  const comprasDoMes = comprasData.filter((c) => c.competencia === competenciaAtualISO);

  const gastoMes = comprasDoMes.reduce((acc, c) => acc + c.valor, 0);

  const caixaAgora =
    vendas.reduce((acc, v) => acc + (v.status_pagamento === "Pago" ? v.valor_total : v.sinal), 0) -
    comprasData.filter((c) => c.forma_pagamento === "pix").reduce((acc, c) => acc + c.valor, 0);

  const compras: CompraRow[] = comprasDoMes.map((c) => toCompraRow(c, cartoes.length));

  const faturasAbertas: FaturaAberta[] = [];
  for (const cartao of cartoes) {
    const vencimento = proximoVencimento(hoje, cartao.dia_vencimento);
    const vencimentoISO = toISODate(vencimento);
    const competenciaFaturaISO = toISODate(primeiroDiaMes(vencimento));

    const itensCartaoTodos = comprasData.filter(
      (c) => c.cartao_id === cartao.id && c.forma_pagamento === "cartao" && c.status === "Na fatura",
    );
    // Uma linha "Na fatura" com competência de um mês já fechado é uma
    // pendência vencida — mostrada à parte, sem se misturar à fatura atual.
    const itensVencidos = itensCartaoTodos
      .filter((c) => c.competencia < competenciaFaturaISO)
      .sort((a, b) => a.competencia.localeCompare(b.competencia));
    const itensAtuais = itensCartaoTodos.filter((c) => c.competencia === competenciaFaturaISO);
    const itensFuturos = itensCartaoTodos
      .filter((c) => c.competencia > competenciaFaturaISO)
      .sort((a, b) => a.competencia.localeCompare(b.competencia));

    if (itensVencidos.length === 0 && itensAtuais.length === 0 && itensFuturos.length === 0) continue;

    // Uma compra parcelada em N linhas vira 1 card resumido aqui: quanto ainda
    // falta pagar no total (incluindo a parcela deste mês, se ainda não paga),
    // o valor da próxima parcela e em que mês cai a última.
    const itensPorGrupo = new Map<string, Compra[]>();
    for (const c of itensCartaoTodos) {
      if (!c.grupo_compra_id) continue;
      const linhas = itensPorGrupo.get(c.grupo_compra_id) ?? [];
      linhas.push(c);
      itensPorGrupo.set(c.grupo_compra_id, linhas);
    }

    const gruposComParcelaFutura = new Set(itensFuturos.map((c) => c.grupo_compra_id!));
    const proximasCompras: ProximaCompra[] = Array.from(gruposComParcelaFutura).map((grupoId) => {
      const linhas = itensPorGrupo.get(grupoId)!;
      const ordenadas = [...linhas].sort((a, b) => a.competencia.localeCompare(b.competencia));
      const proximaParcela = ordenadas.find((c) => c.competencia > competenciaFaturaISO)!;
      const ultimaParcela = ordenadas[ordenadas.length - 1];
      return {
        id: proximaParcela.id,
        fornecedor: proximaParcela.fornecedor,
        item: proximaParcela.item,
        valorParcela: proximaParcela.valor,
        saldoDevedor: linhas.reduce((acc, c) => acc + c.valor, 0),
        ultimaParcelaBR: formatMesAnoBR(ultimaParcela.competencia),
        podeExcluir: podeExcluir(proximaParcela),
      };
    });

    const totalAtual = itensAtuais.reduce((acc, c) => acc + c.valor, 0);
    const totalVencido = itensVencidos.reduce((acc, c) => acc + c.valor, 0);
    const totalGeral = totalAtual + totalVencido;
    const vencidoDesdeBR =
      itensVencidos.length > 0
        ? formatDataBR(vencimentoDaCompetencia(itensVencidos[0].competencia, cartao.dia_vencimento))
        : null;
    const ultimaCompetenciaVencidaISO =
      itensVencidos.length > 0 ? itensVencidos[itensVencidos.length - 1].competencia : null;
    const aReceber = vendas
      .filter(
        (v) =>
          v.status_pagamento !== "Pago" &&
          v.data_entrega &&
          v.data_entrega >= hojeISO &&
          v.data_entrega <= vencimentoISO,
      )
      .reduce((acc, v) => acc + v.restante, 0);
    const saldoPrevisto = caixaAgora + aReceber;

    faturasAbertas.push({
      cartaoId: cartao.id,
      cartaoNome: cartao.nome,
      mostrarNomeCartao: cartoes.length > 1,
      totalAtual,
      totalVencido,
      totalGeral,
      vencidoDesdeBR,
      ultimaCompetenciaVencidaISO,
      vencimentoBR: formatDataBR(vencimento),
      competenciaISO: competenciaFaturaISO,
      saldoPrevisto,
      cobre: saldoPrevisto >= totalGeral,
      itens: itensAtuais.map((c) => toCompraRow({ ...c, cartoes: { nome: cartao.nome } }, cartoes.length)),
      proximasCompras,
    });
  }

  const faturasPagas: FaturaPagaRow[] = faturasPagasData.map((f) => ({
    id: f.id,
    cartaoNome: f.cartoes?.nome ?? "",
    valorTotal: f.valor_total,
    dataPagamentoBR: formatDataISOBR(f.data_pagamento),
  }));

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-[32px] text-tinta">Compras</h1>
        <NovaCompraForm cartoes={cartoes} />
      </div>
      <ComprasModule
        gastoMes={gastoMes}
        compras={compras}
        faturasAbertas={faturasAbertas}
        faturasPagas={faturasPagas}
      />
    </div>
  );
}
