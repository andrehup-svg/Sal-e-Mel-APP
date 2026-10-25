"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };

const UNIDADES = ["un", "kg", "g", "L", "ml", "pacote", "caixa"];

function lerCampos(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const unidade = String(formData.get("unidade") ?? "un");
  const quantidade = Number(String(formData.get("quantidade") ?? "").replace(",", "."));
  const minimo = Number(String(formData.get("minimo") ?? "").replace(",", "."));

  if (!nome) return { error: "Informe o nome do insumo." } as const;
  if (!UNIDADES.includes(unidade)) return { error: "Unidade inválida." } as const;
  if (!Number.isFinite(quantidade) || quantidade < 0) return { error: "Quantidade inválida." } as const;
  if (!Number.isFinite(minimo) || minimo < 0) return { error: "Mínimo inválido." } as const;

  return { error: null, dados: { nome, unidade, quantidade, minimo } } as const;
}

export async function criarItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const campos = lerCampos(formData);
  if (campos.error) return { error: campos.error };

  const supabase = await createClient();
  const { error } = await supabase.from("estoque").insert(campos.dados);
  if (error) return { error: error.message };

  revalidatePath("/estoque");
  return { error: null };
}

export async function editarItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Item inválido." };

  const campos = lerCampos(formData);
  if (campos.error) return { error: campos.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("estoque")
    .update({ ...campos.dados, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/estoque");
  return { error: null };
}

export async function removerItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Item inválido." };

  const supabase = await createClient();
  const { error } = await supabase.from("estoque").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/estoque");
  return { error: null };
}

export async function definirQuantidade(id: string, quantidade: number): Promise<ActionState> {
  if (!id || !Number.isFinite(quantidade) || quantidade < 0) return { error: "Quantidade inválida." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("estoque")
    .update({ quantidade, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/estoque");
  return { error: null };
}
