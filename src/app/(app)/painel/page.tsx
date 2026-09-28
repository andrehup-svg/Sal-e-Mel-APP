import { createClient } from "@/lib/supabase/server";
import PainelModule from "./PainelModule";
import { formatDataBR } from "@/lib/faturas";
import type { Compra, ParametrosDivisao, Venda } from "@/lib/types";
import type { VendaComItens } from "../vendas/types";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function PainelPage() {
  const supabase = await createClient();

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioProximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const hojeISO = toISODate(hoje);

  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const fimMesISO = toISODate(fimMes);

  const [vendasRes, comprasRes, comprasPixRes, parametrosRes, entregasRes] = await Promise.all([
    supabase
      .from("vendas")
      .select("id, valor_total, sinal, restante, status_pagamento, data_entrega, created_at"),
    supabase
      .from("compras")
      .select("id, valor, data_compra")
      .gte("data_compra", toISODate(inicioMes))
      .lt("data_compra", toISODate(inicioProximoMes)),
    supabase.from("compras").select("valor").eq("forma_pagamento", "pix"),
    supabase.from("parametros_divisao").select("*").eq("id", 1).single(),
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

  const vendasMes = todasVendas
    .filter((v) => v.created_at >= inicioMes.toISOString() && v.created_at < inicioProximoMes.toISOString())
    .reduce((acc, v) => acc + v.valor_total, 0);
  const comprasMes = ((comprasRes.data ?? []) as Pick<Compra, "valor">[]).reduce(
    (acc, c) => acc + c.valor,
    0,
  );
  const parametros = parametrosRes.data as ParametrosDivisao | null;
  const percentualSocia = parametros?.percentual_socia ?? 50;

  const lucroMes = vendasMes - comprasMes;
  const parteSocia = Math.round(lucroMes * (percentualSocia / 100) * 100) / 100;
  const parteDono = Math.round((lucroMes - parteSocia) * 100) / 100;

  // Saldo atual = mesma lógica de "Caixa agora" da tela de Compras: o que já
  // está de fato disponível hoje (valor cheio das vendas Pagas + sinal das
  // Pendentes), descontado do que já saiu via Pix.
  const totalPix = ((comprasPixRes.data ?? []) as Pick<Compra, "valor">[]).reduce(
    (acc, c) => acc + c.valor,
    0,
  );
  const saldoAtual =
    todasVendas.reduce((acc, v) => acc + (v.status_pagamento === "Pago" ? v.valor_total : v.sinal), 0) -
    totalPix;

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

  const mesLabel = `${MESES[hoje.getMonth()]} ${hoje.getFullYear()}`;

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
