"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidarAgenda() {
  revalidatePath("/agenda");
  revalidatePath("/vendas");
  revalidatePath("/painel");
}

export async function atualizarDataEntrega(
  vendaId: string,
  dataEntrega: string,
): Promise<{ error: string | null }> {
  if (!vendaId) return { error: "Venda inválida." };
  if (!dataEntrega) return { error: "Informe uma data." };

  const supabase = await createClient();
  const { error } = await supabase.from("vendas").update({ data_entrega: dataEntrega }).eq("id", vendaId);

  if (error) return { error: error.message };

  revalidarAgenda();
  return { error: null };
}

export async function marcarEntregue(vendaId: string): Promise<{ error: string | null }> {
  if (!vendaId) return { error: "Venda inválida." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("vendas")
    .update({ status_entrega: "Entregue" })
    .eq("id", vendaId);

  if (error) return { error: error.message };

  revalidarAgenda();
  return { error: null };
}
