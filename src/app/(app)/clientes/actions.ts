"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { telefoneValido } from "@/lib/telefone";

export type ActionState = { error: string | null };

const FK_VIOLATION = "23503";
const TELEFONE_INVALIDO = "Telefone inválido. Use o formato (DDD) 9XXXX-XXXX.";

export async function criarCliente(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();

  if (!nome) return { error: "Informe o nome do cliente." };
  if (telefone && !telefoneValido(telefone)) return { error: TELEFONE_INVALIDO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .insert({ nome, telefone: telefone || null });

  if (error) return { error: error.message };

  revalidatePath("/clientes");
  return { error: null };
}

export async function editarCliente(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();

  if (!id) return { error: "Cliente inválido." };
  if (!nome) return { error: "Informe o nome do cliente." };
  if (telefone && !telefoneValido(telefone)) return { error: TELEFONE_INVALIDO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update({ nome, telefone: telefone || null })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/clientes");
  return { error: null };
}

export async function removerCliente(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Cliente inválido." };

  const supabase = await createClient();
  const { error } = await supabase.from("clientes").delete().eq("id", id);

  if (error) {
    if (error.code === FK_VIOLATION) {
      return { error: "Esse cliente tem pedidos vinculados e não pode ser removido." };
    }
    return { error: error.message };
  }

  revalidatePath("/clientes");
  return { error: null };
}
