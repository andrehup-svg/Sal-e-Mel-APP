import { createClient } from "@/lib/supabase/server";
import PainelModule from "./PainelModule";
import type { Compra, ParametrosDivisao } from "@/lib/types";
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

  const [vendasRes, comprasRes, parametrosRes, entregasRes] = await Promise.all([
    supabase
      .from("vendas")
      .select("id, valor_total, created_at")
      .gte("created_at", inicioMes.toISOString())
      .lt("created_at", inicioProximoMes.toISOString()),
    supabase
      .from("compras")
      .select("id, valor, data_compra")
      .gte("data_compra", toISODate(inicioMes))
      .lt("data_compra", toISODate(inicioProximoMes)),
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

  const vendasMes = ((vendasRes.data ?? []) as { valor_total: number }[]).reduce(
    (acc, v) => acc + v.valor_total,
    0,
  );
  const comprasMes = ((comprasRes.data ?? []) as Pick<Compra, "valor">[]).reduce(
    (acc, c) => acc + c.valor,
    0,
  );
  const parametros = parametrosRes.data as ParametrosDivisao | null;
  const percentualSocia = parametros?.percentual_socia ?? 50;

  const lucroMes = vendasMes - comprasMes;
  const parteSocia = Math.round(lucroMes * (percentualSocia / 100) * 100) / 100;
  const parteDono = Math.round((lucroMes - parteSocia) * 100) / 100;

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
      proximasEntregas={proximasEntregas}
    />
  );
}
