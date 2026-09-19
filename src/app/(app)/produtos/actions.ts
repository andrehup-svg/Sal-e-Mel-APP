"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TipoPrecificacao } from "@/lib/types";

export type ActionState = { error: string | null };

const FK_VIOLATION = "23503";

function parseTipo(formData: FormData): TipoPrecificacao {
  return formData.get("tipo") === "unidade" ? "unidade" : "cento";
}

function parseValor(formData: FormData, campo: string): number | null {
  const raw = formData.get(campo);
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseAtacado(
  formData: FormData,
): { error: string } | { error: null; precoAtacado: number | null; quantidadeMinima: number | null } {
  const precoAtacado = parseValor(formData, "preco_unidade_atacado");
  const quantidadeMinima = parseValor(formData, "quantidade_minima_atacado");

  if (precoAtacado === null && quantidadeMinima === null) {
    return { error: null, precoAtacado: null, quantidadeMinima: null };
  }
  if (precoAtacado === null || precoAtacado <= 0 || quantidadeMinima === null || quantidadeMinima <= 0) {
    return { error: "Preencha os dois campos de atacado (preço e quantidade), ou deixe os dois em branco." };
  }
  return { error: null, precoAtacado, quantidadeMinima };
}

export async function criarCategoria(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = parseTipo(formData);
  const precoCento = parseValor(formData, "preco_cento");
  const precoUnidade = parseValor(formData, "preco_unidade");

  if (!nome) return { error: "Informe o nome da categoria." };
  if (tipo === "cento" && (precoCento === null || precoCento <= 0)) {
    return { error: "Informe o preço por cento da categoria." };
  }
  if (precoUnidade === null || precoUnidade <= 0) {
    return { error: "Informe o preço por unidade da categoria." };
  }
  const atacado = parseAtacado(formData);
  if (atacado.error !== null) return { error: atacado.error };

  const supabase = await createClient();
  const { error } = await supabase.from("categorias_preco").insert({
    nome,
    tipo,
    preco_cento: tipo === "cento" ? precoCento : null,
    preco_unidade: precoUnidade,
    preco_unidade_atacado: atacado.precoAtacado,
    quantidade_minima_atacado: atacado.quantidadeMinima,
  });

  if (error) return { error: error.message };

  revalidatePath("/produtos");
  return { error: null };
}

export async function editarCategoria(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = parseTipo(formData);
  const precoCento = parseValor(formData, "preco_cento");
  const precoUnidade = parseValor(formData, "preco_unidade");

  if (!id) return { error: "Categoria inválida." };
  if (!nome) return { error: "Informe o nome da categoria." };
  if (tipo === "cento" && (precoCento === null || precoCento <= 0)) {
    return { error: "Informe o preço por cento da categoria." };
  }
  if (precoUnidade === null || precoUnidade <= 0) {
    return { error: "Informe o preço por unidade da categoria." };
  }
  const atacado = parseAtacado(formData);
  if (atacado.error !== null) return { error: atacado.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categorias_preco")
    .update({
      nome,
      tipo,
      preco_cento: tipo === "cento" ? precoCento : null,
      preco_unidade: precoUnidade,
      preco_unidade_atacado: atacado.precoAtacado,
      quantidade_minima_atacado: atacado.quantidadeMinima,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/produtos");
  return { error: null };
}

export async function removerCategoria(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Categoria inválida." };

  const supabase = await createClient();
  const { error } = await supabase.from("categorias_preco").delete().eq("id", id);

  if (error) {
    if (error.code === FK_VIOLATION) {
      return { error: "Essa categoria tem produtos vinculados e não pode ser removida." };
    }
    return { error: error.message };
  }

  revalidatePath("/produtos");
  return { error: null };
}

export async function criarProduto(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const categoriaId = String(formData.get("categoria_id") ?? "");

  if (!nome) return { error: "Informe o nome do produto." };
  if (!categoriaId) return { error: "Selecione uma categoria." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("produtos")
    .insert({ nome, categoria_id: categoriaId });

  if (error) return { error: error.message };

  revalidatePath("/produtos");
  return { error: null };
}

export async function editarProduto(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const categoriaId = String(formData.get("categoria_id") ?? "");

  if (!id) return { error: "Produto inválido." };
  if (!nome) return { error: "Informe o nome do produto." };
  if (!categoriaId) return { error: "Selecione uma categoria." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("produtos")
    .update({ nome, categoria_id: categoriaId })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/produtos");
  return { error: null };
}

export async function removerProduto(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Produto inválido." };

  const supabase = await createClient();
  const { error } = await supabase.from("produtos").delete().eq("id", id);

  if (error) {
    if (error.code === FK_VIOLATION) {
      return { error: "Esse produto já foi vendido e não pode ser removido." };
    }
    return { error: error.message };
  }

  revalidatePath("/produtos");
  return { error: null };
}
