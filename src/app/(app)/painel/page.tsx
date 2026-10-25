import { createClient } from "@/lib/supabase/server";
import PainelModule from "./PainelModule";
import { formatDataBR } from "@/lib/faturas";
import type { Compra, DivisaoStatusMensal, ParametrosDivisao, Venda } from "@/lib/types";
import {
  dividirLucro,
  hojeISOBrasil,
  mesReferencia,
  nomeMes,
  percentualDoMes,
  somaComprasDoMes,
  somaVendasDoMes,
} from "@/lib/lucro";
import type { VendaComItens } from "../vendas/types";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function PainelPage() {
  const supabase = await createClient();

  const hoje = new Date();
  const hojeISO = toISODate(hoje);

  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const fimMesISO = toISODate(fimMes);

  const mesAtual = mesReferencia(hojeISOBrasil());

  const [vendasRes, comprasRes, comprasPagasRes, parametrosRes, statusMesRes, entregasRes] = await Promise.all([
    supabase
      .from("vendas")
      .select("id, valor_total, sinal, restante, status_pagamento, data_entrega, created_at"),
    supabase
      .from("compras")
      .select("id, valor, data_compra")
      .gte("data_compra", mesAtual)
      .lte("data_compra", fimMesISO),
    supabase.from("compras").select("valor").eq("status", "Pago"),
    supabase.from("parametros_divisao").select("*").eq("id", 1).single(),
    supabase.from("divisao_status_mensal").select("*").eq("mes_referencia", mesAtual).maybeSingle(),
    supabase
      .from("vendas")
      .select(
        "id, data_entrega, valor_total, sinal, restante, status_pagamento, status_entrega, created_at, clientes(nome), venda_itens(quantidade, produtos(nome))",
      )
      .eq("status_entrega", "Pendente")
      .gte("data_entrega", hojeISO)
      .order("data_entrega", { ascending: true })
      .limit(5),
  ]);

  const todasVendas = (vendasRes.data ?? []) as Pick<
    Venda,
    "id" | "valor_total" | "sinal" | "restante" | "status_pagamento" | "data_entrega" | "created_at"
  >[];

  const vendasMes = somaVendasDoMes(todasVendas, mesAtual).total;
  const comprasMes = somaComprasDoMes(
    (comprasRes.data ?? []) as Pick<Compra, "valor" | "data_compra">[],
    mesAtual,
  ).total;
  const parametros = parametrosRes.data as ParametrosDivisao | null;
  const percentualSocia = percentualDoMes(
    statusMesRes.data as DivisaoStatusMensal | null,
    parametros?.percentual_socia ?? 50,
  );

  const lucroMes = vendasMes - comprasMes;
  const { parteSocia, parteDono } = dividirLucro(lucroMes, percentualSocia);

  // Saldo atual = mesma lógica de "Caixa agora" da tela de Compras: o que já
  // está de fato disponível hoje (valor cheio das vendas Pagas + sinal das
  // Pendentes), descontado do que já saiu do caixa: Pix na hora e cartão
  // depois que a fatura é paga (pagar_fatura muda o status pra "Pago").
  const totalComprasPagas = ((comprasPagasRes.data ?? []) as Pick<Compra, "valor">[]).reduce(
    (acc, c) => acc + c.valor,
    0,
  );
  const saldoAtual =
    todasVendas.reduce((acc, v) => acc + (v.status_pagamento === "Pago" ? v.valor_total : v.sinal), 0) -
    totalComprasPagas;

  // Saldo previsto até o fim do mês = saldo atual + o "restante" das vendas
  // com entrega agendada até o último dia deste mês e que ainda não estão pagas.
  const aReceberFimMes = todasVendas
    .filter(
      (v) =>
        v.status_pagamento !== "Pago" &&
        v.data_entrega &&
        v.data_entrega >= hojeISO &&
        v.data_entrega <= fimMesISO,
    )
    .reduce((acc, v) => acc + v.restante, 0);
  const saldoPrevistoFimMes = saldoAtual + aReceberFimMes;

  const proximasEntregas = (entregasRes.data ?? []) as unknown as VendaComItens[];

  const mesLabel = nomeMes(mesAtual);

  return (
    <PainelModule
      mesLabel={mesLabel}
      lucroMes={lucroMes}
      parteDono={parteDono}
      parteSocia={parteSocia}
      vendasMes={vendasMes}
      comprasMes={comprasMes}
      saldoAtual={saldoAtual}
      saldoPrevistoFimMes={saldoPrevistoFimMes}
      fimMesBR={formatDataBR(fimMes)}
      proximasEntregas={proximasEntregas}
    />
  );
}
