"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hojeISOBrasil, mesDaCompra, mesDaVenda, mesReferencia } from "@/lib/lucro";
import type { DivisaoStatusMensal } from "@/lib/types";

type Resultado = { error: string | null };

function revalidarDivisao() {
  revalidatePath("/divisao");
  revalidatePath("/painel");
}

function mesValido(mes: string) {
  return /^\d{4}-\d{2}-01$/.test(mes);
}

async function percentualVigente(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("parametros_divisao").select("percentual_socia").eq("id", 1).single();
  return (data?.percentual_socia as number | undefined) ?? 50;
}

// Marcar (ou desfazer) retirada/repasse de um mês. Ao marcar, o percentual
// do mês é congelado — o valor que saiu do caixa não pode mudar depois se
// o percentual vigente for alterado.
async function atualizarStatus(
  mes: string,
  campos: Partial<Pick<DivisaoStatusMensal, "status_dono" | "data_retirada" | "status_socia" | "data_repasse">>,
): Promise<Resultado> {
  if (!mesValido(mes)) return { error: "Mês inválido." };

  const supabase = await createClient();
  const { data: existente, error: erroBusca } = await supabase
    .from("divisao_status_mensal")
    .select("*")
    .eq("mes_referencia", mes)
    .maybeSingle();
  if (erroBusca) return { error: erroBusca.message };

  const linha = existente as DivisaoStatusMensal | null;
  const percentual = linha?.percentual_socia ?? (await percentualVigente(supabase));

  const { error } = linha
    ? await supabase
        .from("divisao_status_mensal")
        .update({ ...campos, percentual_socia: percentual })
        .eq("id", linha.id)
    : await supabase
        .from("divisao_status_mensal")
        .insert({ mes_referencia: mes, ...campos, percentual_socia: percentual });

  if (error) return { error: error.message };

  revalidarDivisao();
  return { error: null };
}

export async function marcarRetirado(mes: string, retirado: boolean) {
  return atualizarStatus(
    mes,
    retirado
      ? { status_dono: "Retirado", data_retirada: hojeISOBrasil() }
      : { status_dono: "Ainda no caixa do negócio", data_retirada: null },
  );
}

export async function marcarRepassado(mes: string, repassado: boolean) {
  return atualizarStatus(
    mes,
    repassado
      ? { status_socia: "Repassado", data_repasse: hojeISOBrasil() }
      : { status_socia: "Pendente de repasse", data_repasse: null },
  );
}

// O novo percentual vale "daqui pra frente": do mês atual em diante.
// Antes de trocar, todo mês passado com movimento (e todo mês que já tem
// linha de status) recebe o percentual antigo congelado, se ainda não tiver.
export async function alterarPercentualSocia(novoPercentual: number): Promise<Resultado> {
  if (!Number.isFinite(novoPercentual) || novoPercentual < 0 || novoPercentual > 100) {
    return { error: "O percentual precisa estar entre 0 e 100." };
  }
  const novo = Math.round(novoPercentual * 100) / 100;

  const supabase = await createClient();
  const antigo = await percentualVigente(supabase);
  if (novo === antigo) return { error: null };

  const mesAtual = mesReferencia(hojeISOBrasil());

  const [vendasRes, comprasRes, statusRes] = await Promise.all([
    supabase.from("vendas").select("created_at"),
    supabase.from("compras").select("data_compra"),
    supabase.from("divisao_status_mensal").select("mes_referencia, percentual_socia"),
  ]);
  const erro = vendasRes.error ?? comprasRes.error ?? statusRes.error;
  if (erro) return { error: erro.message };

  const mesesPassados = new Set<string>();
  for (const v of vendasRes.data ?? []) mesesPassados.add(mesDaVenda(v.created_at as string));
  for (const c of comprasRes.data ?? []) {
    const m = mesDaCompra(c.data_compra as string | null);
    if (m) mesesPassados.add(m);
  }
  for (const m of [...mesesPassados]) if (m >= mesAtual) mesesPassados.delete(m);

  const linhas = (statusRes.data ?? []) as Pick<DivisaoStatusMensal, "mes_referencia" | "percentual_socia">[];
  const comLinha = new Set(linhas.map((l) => l.mes_referencia));

  const semPercentual = linhas
    .filter((l) => l.percentual_socia === null && l.mes_referencia < mesAtual)
    .map((l) => l.mes_referencia);
  if (semPercentual.length > 0) {
    const { error } = await supabase
      .from("divisao_status_mensal")
      .update({ percentual_socia: antigo })
      .in("mes_referencia", semPercentual);
    if (error) return { error: error.message };
  }

  const novasLinhas = [...mesesPassados]
    .filter((m) => !comLinha.has(m))
    .map((m) => ({ mes_referencia: m, percentual_socia: antigo }));
  if (novasLinhas.length > 0) {
    const { error } = await supabase.from("divisao_status_mensal").insert(novasLinhas);
    if (error) return { error: error.message };
  }

  const { error } = await supabase.from("parametros_divisao").update({ percentual_socia: novo }).eq("id", 1);
  if (error) return { error: error.message };

  revalidarDivisao();
  return { error: null };
}
