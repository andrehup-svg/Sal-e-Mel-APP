"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularValorItem } from "@/lib/precificacao";
import type { CategoriaPreco, TipoPrecificacao } from "@/lib/types";

export type ItemInput = { produto_id: string; quantidade: number; modo: TipoPrecificacao };

export type CriarVendaInput = {
  cliente_id: string;
  data_entrega: string | null;
  sinal: number;
  itens: ItemInput[];
};

export type CriarVendaResult =
  | { error: string; venda?: undefined }
  | { error: null; venda: { valor_total: number; sinal: number; restante: number } };

type ItemCalculado = {
  produto_id: string;
  quantidade: number;
  valor_item: number;
  modo_preco: TipoPrecificacao;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function calcularItensVenda(
  supabase: Supabase,
  itens: ItemInput[],
): Promise<{ error: string } | { error: null; valorTotal: number; itensCalculados: ItemCalculado[] }> {
  const produtoIds = [...new Set(itens.map((i) => i.produto_id))];
  const { data: produtosData, error: produtosError } = await supabase
    .from("produtos")
    .select(
      "id, categorias_preco(id, nome, tipo, preco_cento, preco_unidade, preco_unidade_atacado, quantidade_minima_atacado, created_at)",
    )
    .in("id", produtoIds);

  if (produtosError || !produtosData) return { error: "Erro ao carregar produtos." };

  const produtoMap = new Map(produtosData.map((p) => [p.id, p]));

  let valorTotal = 0;
  const itensCalculados: ItemCalculado[] = [];

  for (const item of itens) {
    const produto = produtoMap.get(item.produto_id);
    const categoria = produto?.categorias_preco as unknown as CategoriaPreco | null;
    if (!produto || !categoria) return { error: "Produto inválido." };
    const modo: TipoPrecificacao = categoria.tipo === "unidade" ? "unidade" : item.modo;
    const valorItem = calcularValorItem(categoria, item.quantidade, modo);
    valorTotal += valorItem;
    itensCalculados.push({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      valor_item: valorItem,
      modo_preco: modo,
    });
  }

  return { error: null, valorTotal, itensCalculados };
}

async function ajustarVendidoMes(supabase: Supabase, deltas: Map<string, number>) {
  for (const [produtoId, delta] of deltas) {
    if (delta === 0) continue;
    const { data: produto } = await supabase
      .from("produtos")
      .select("vendido_mes")
      .eq("id", produtoId)
      .single();
    if (!produto) continue;
    await supabase
      .from("produtos")
      .update({ vendido_mes: Math.max(0, (produto.vendido_mes ?? 0) + delta) })
      .eq("id", produtoId);
  }
}

function somarQuantidades(itens: { produto_id: string; quantidade: number }[], sinal: 1 | -1) {
  const deltas = new Map<string, number>();
  for (const item of itens) {
    deltas.set(item.produto_id, (deltas.get(item.produto_id) ?? 0) + sinal * item.quantidade);
  }
  return deltas;
}

export async function criarVenda(input: CriarVendaInput): Promise<CriarVendaResult> {
  if (!input.cliente_id) return { error: "Selecione um cliente." };

  const itensValidos = input.itens.filter((i) => i.produto_id && i.quantidade > 0);
  if (itensValidos.length === 0) return { error: "Adicione ao menos um item." };

  const supabase = await createClient();
  const calculo = await calcularItensVenda(supabase, itensValidos);
  if (calculo.error !== null) return { error: calculo.error };

  const { valorTotal, itensCalculados } = calculo;
  const sinal = Math.max(0, input.sinal);
  const restante = valorTotal - sinal;
  const statusPagamento = restante <= 0 ? "Pago" : "Pendente";

  const { data: venda, error: vendaError } = await supabase
    .from("vendas")
    .insert({
      cliente_id: input.cliente_id,
      data_entrega: input.data_entrega,
      valor_total: valorTotal,
      sinal,
      restante,
      status_pagamento: statusPagamento,
    })
    .select()
    .single();

  if (vendaError || !venda) return { error: vendaError?.message ?? "Erro ao salvar venda." };

  const { error: itensError } = await supabase
    .from("venda_itens")
    .insert(itensCalculados.map((i) => ({ ...i, venda_id: venda.id })));

  if (itensError) return { error: itensError.message };

  await ajustarVendidoMes(supabase, somarQuantidades(itensValidos, 1));

  revalidatePath("/vendas");
  revalidatePath("/produtos");
  revalidatePath("/clientes");

  return { error: null, venda: { valor_total: valorTotal, sinal, restante } };
}

export async function editarVenda(
  vendaId: string,
  input: CriarVendaInput,
): Promise<CriarVendaResult> {
  if (!vendaId) return { error: "Venda inválida." };
  if (!input.cliente_id) return { error: "Selecione um cliente." };

  const itensValidos = input.itens.filter((i) => i.produto_id && i.quantidade > 0);
  if (itensValidos.length === 0) return { error: "Adicione ao menos um item." };

  const supabase = await createClient();

  const { data: itensAntigos, error: itensAntigosError } = await supabase
    .from("venda_itens")
    .select("produto_id, quantidade")
    .eq("venda_id", vendaId);

  if (itensAntigosError) return { error: itensAntigosError.message };

  const calculo = await calcularItensVenda(supabase, itensValidos);
  if (calculo.error !== null) return { error: calculo.error };

  const { valorTotal, itensCalculados } = calculo;
  const sinal = Math.max(0, input.sinal);
  const restante = valorTotal - sinal;
  const statusPagamento = restante <= 0 ? "Pago" : "Pendente";

  const { error: vendaError } = await supabase
    .from("vendas")
    .update({
      cliente_id: input.cliente_id,
      data_entrega: input.data_entrega,
      valor_total: valorTotal,
      sinal,
      restante,
      status_pagamento: statusPagamento,
    })
    .eq("id", vendaId);

  if (vendaError) return { error: vendaError.message };

  const { error: deleteError } = await supabase.from("venda_itens").delete().eq("venda_id", vendaId);
  if (deleteError) return { error: deleteError.message };

  const { error: itensError } = await supabase
    .from("venda_itens")
    .insert(itensCalculados.map((i) => ({ ...i, venda_id: vendaId })));

  if (itensError) return { error: itensError.message };

  const deltas = somarQuantidades(itensAntigos ?? [], -1);
  for (const [produtoId, delta] of somarQuantidades(itensValidos, 1)) {
    deltas.set(produtoId, (deltas.get(produtoId) ?? 0) + delta);
  }
  await ajustarVendidoMes(supabase, deltas);

  revalidatePath("/vendas");
  revalidatePath("/produtos");
  revalidatePath("/clientes");

  return { error: null, venda: { valor_total: valorTotal, sinal, restante } };
}

export async function excluirVenda(vendaId: string): Promise<{ error: string | null }> {
  if (!vendaId) return { error: "Venda inválida." };

  const supabase = await createClient();

  const { data: itens, error: itensError } = await supabase
    .from("venda_itens")
    .select("produto_id, quantidade")
    .eq("venda_id", vendaId);

  if (itensError) return { error: itensError.message };

  const { error: vendaError } = await supabase.from("vendas").delete().eq("id", vendaId);
  if (vendaError) return { error: vendaError.message };

  await ajustarVendidoMes(supabase, somarQuantidades(itens ?? [], -1));

  revalidatePath("/vendas");
  revalidatePath("/produtos");
  revalidatePath("/clientes");

  return { error: null };
}
