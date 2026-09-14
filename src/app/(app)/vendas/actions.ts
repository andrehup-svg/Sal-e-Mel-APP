"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularValorItem } from "@/lib/precificacao";
import type { CategoriaPreco } from "@/lib/types";

export type ItemInput = { produto_id: string; quantidade: number };

export type CriarVendaInput = {
  cliente_id: string;
  data_entrega: string | null;
  sinal: number;
  itens: ItemInput[];
};

export type CriarVendaResult =
  | { error: string; venda?: undefined }
  | { error: null; venda: { valor_total: number; sinal: number; restante: number } };

export async function criarVenda(input: CriarVendaInput): Promise<CriarVendaResult> {
  if (!input.cliente_id) return { error: "Selecione um cliente." };

  const itensValidos = input.itens.filter((i) => i.produto_id && i.quantidade > 0);
  if (itensValidos.length === 0) return { error: "Adicione ao menos um item." };

  const supabase = await createClient();

  const produtoIds = [...new Set(itensValidos.map((i) => i.produto_id))];
  const { data: produtosData, error: produtosError } = await supabase
    .from("produtos")
    .select("id, vendido_mes, categorias_preco(id, nome, tipo, preco, created_at)")
    .in("id", produtoIds);

  if (produtosError || !produtosData) return { error: "Erro ao carregar produtos." };

  const produtoMap = new Map(produtosData.map((p) => [p.id, p]));

  let valorTotal = 0;
  const itensParaInserir: { produto_id: string; quantidade: number; valor_item: number }[] = [];

  for (const item of itensValidos) {
    const produto = produtoMap.get(item.produto_id);
    const categoria = produto?.categorias_preco as unknown as CategoriaPreco | null;
    if (!produto || !categoria) return { error: "Produto inválido." };
    const valorItem = calcularValorItem(categoria, item.quantidade);
    valorTotal += valorItem;
    itensParaInserir.push({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      valor_item: valorItem,
    });
  }

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
    .insert(itensParaInserir.map((i) => ({ ...i, venda_id: venda.id })));

  if (itensError) return { error: itensError.message };

  const quantidadePorProduto = new Map<string, number>();
  for (const item of itensValidos) {
    quantidadePorProduto.set(
      item.produto_id,
      (quantidadePorProduto.get(item.produto_id) ?? 0) + item.quantidade,
    );
  }

  for (const [produtoId, quantidade] of quantidadePorProduto) {
    const produto = produtoMap.get(produtoId)!;
    await supabase
      .from("produtos")
      .update({ vendido_mes: (produto.vendido_mes ?? 0) + quantidade })
      .eq("id", produtoId);
  }

  revalidatePath("/vendas");
  revalidatePath("/produtos");
  revalidatePath("/clientes");

  return { error: null, venda: { valor_total: valorTotal, sinal, restante } };
}
