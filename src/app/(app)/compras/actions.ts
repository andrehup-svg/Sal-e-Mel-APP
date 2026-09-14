"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseISODate, primeiroDiaMes, proximoVencimento, toISODate } from "@/lib/faturas";

export type ActionState = { error: string | null };

const MAX_PARCELAS = 24;

export async function criarCompra(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const fornecedor = String(formData.get("fornecedor") ?? "").trim();
  const item = String(formData.get("item") ?? "").trim() || null;
  const valor = Number(formData.get("valor"));
  const formaPagamento = formData.get("forma_pagamento") === "cartao" ? "cartao" : "pix";
  const cartaoId = String(formData.get("cartao_id") ?? "") || null;
  const dataCompra = String(formData.get("data_compra") ?? "") || null;
  const competenciaEscolhida = String(formData.get("competencia") ?? "") || null;
  const parcelas =
    formaPagamento === "cartao"
      ? Math.min(MAX_PARCELAS, Math.max(1, Math.trunc(Number(formData.get("parcelas")) || 1)))
      : 1;

  if (!fornecedor) return { error: "Informe o fornecedor." };
  if (!Number.isFinite(valor) || valor <= 0) return { error: "Informe o valor da compra." };
  if (formaPagamento === "cartao" && !cartaoId) {
    return { error: "Nenhum cartão de crédito cadastrado." };
  }
  if (!dataCompra) return { error: "Informe a data da compra." };

  const supabase = await createClient();

  if (formaPagamento === "pix") {
    const competencia = toISODate(primeiroDiaMes(parseISODate(dataCompra)));
    const { error } = await supabase.from("compras").insert({
      fornecedor,
      item,
      valor,
      forma_pagamento: "pix",
      cartao_id: null,
      status: "Pago",
      data_compra: dataCompra,
      competencia,
      numero_parcela: 1,
      total_parcelas: 1,
    });
    if (error) return { error: error.message };
  } else {
    const { data: cartao, error: cartaoError } = await supabase
      .from("cartoes")
      .select("dia_vencimento")
      .eq("id", cartaoId)
      .single();
    if (cartaoError || !cartao) return { error: "Cartão inválido." };

    const primeiraCompetencia = competenciaEscolhida
      ? primeiroDiaMes(parseISODate(competenciaEscolhida))
      : primeiroDiaMes(proximoVencimento(new Date(), cartao.dia_vencimento));
    const grupoCompraId = parcelas > 1 ? randomUUID() : null;

    // Distribui o valor em centavos pra fechar exatamente o total,
    // absorvendo o resto do arredondamento na última parcela.
    const totalCentavos = Math.round(valor * 100);
    const baseCentavos = Math.floor(totalCentavos / parcelas);

    const linhas = Array.from({ length: parcelas }, (_, i) => {
      const centavos = i < parcelas - 1 ? baseCentavos : totalCentavos - baseCentavos * (parcelas - 1);
      const competenciaData = new Date(
        primeiraCompetencia.getFullYear(),
        primeiraCompetencia.getMonth() + i,
        1,
      );
      return {
        fornecedor,
        item,
        valor: centavos / 100,
        forma_pagamento: "cartao" as const,
        cartao_id: cartaoId,
        status: "Na fatura" as const,
        data_compra: dataCompra,
        competencia: toISODate(competenciaData),
        grupo_compra_id: grupoCompraId,
        numero_parcela: i + 1,
        total_parcelas: parcelas,
      };
    });

    const { error } = await supabase.from("compras").insert(linhas);
    if (error) return { error: error.message };
  }

  revalidatePath("/compras");
  revalidatePath("/painel");
  return { error: null };
}

export async function editarCompra(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const fornecedor = String(formData.get("fornecedor") ?? "").trim();
  const item = String(formData.get("item") ?? "").trim() || null;
  const valor = Number(formData.get("valor"));
  const dataCompra = String(formData.get("data_compra") ?? "") || null;

  if (!id) return { error: "Compra inválida." };
  if (!fornecedor) return { error: "Informe o fornecedor." };
  if (!Number.isFinite(valor) || valor <= 0) return { error: "Informe o valor da compra." };
  if (!dataCompra) return { error: "Informe a data da compra." };

  const supabase = await createClient();

  const { data: compra, error: fetchError } = await supabase
    .from("compras")
    .select("forma_pagamento, status, total_parcelas")
    .eq("id", id)
    .single();
  if (fetchError || !compra) return { error: "Compra não encontrada." };
  if (compra.total_parcelas > 1) {
    return { error: "Compras parceladas não podem ser editadas — exclua e lance de novo." };
  }
  if (compra.forma_pagamento === "cartao" && compra.status === "Pago") {
    return { error: "Essa compra já está numa fatura paga e não pode ser editada." };
  }

  const patch: Record<string, unknown> = { fornecedor, item, valor, data_compra: dataCompra };
  if (compra.forma_pagamento === "pix") {
    patch.competencia = toISODate(primeiroDiaMes(parseISODate(dataCompra)));
  }

  const { error } = await supabase.from("compras").update(patch).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/compras");
  revalidatePath("/painel");
  return { error: null };
}

export async function excluirCompra(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Compra inválida." };

  const supabase = await createClient();

  const { data: compra, error: fetchError } = await supabase
    .from("compras")
    .select("id, grupo_compra_id")
    .eq("id", id)
    .single();
  if (fetchError || !compra) return { error: "Compra não encontrada." };

  // Se for uma parcela de uma compra parcelada, o grupo inteiro entra na
  // jogada — mas só as parcelas ainda não pagas: as pagas ficam como
  // histórico (já contam no total de uma fatura já quitada).
  const query = compra.grupo_compra_id
    ? supabase.from("compras").select("id, forma_pagamento, status").eq("grupo_compra_id", compra.grupo_compra_id)
    : supabase.from("compras").select("id, forma_pagamento, status").eq("id", id);

  const { data: linhas, error: linhasError } = await query;
  if (linhasError) return { error: linhasError.message };

  const idsExcluiveis = (linhas ?? [])
    .filter((c) => !(c.forma_pagamento === "cartao" && c.status === "Pago"))
    .map((c) => c.id);

  if (idsExcluiveis.length === 0) {
    return { error: "Essa compra já está numa fatura paga e não pode ser excluída." };
  }

  const { error } = await supabase.from("compras").delete().in("id", idsExcluiveis);
  if (error) return { error: error.message };

  revalidatePath("/compras");
  revalidatePath("/painel");
  return { error: null };
}

export async function pagarFatura(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const cartaoId = String(formData.get("cartao_id") ?? "");
  const competencia = String(formData.get("competencia") ?? "");
  if (!cartaoId || !competencia) return { error: "Fatura inválida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("pagar_fatura", {
    p_cartao_id: cartaoId,
    p_competencia: competencia,
  });

  if (error) return { error: error.message };

  revalidatePath("/compras");
  revalidatePath("/painel");
  return { error: null };
}
