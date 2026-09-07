import { createClient } from "@/lib/supabase/server";
import ClientesModule from "./ClientesModule";
import type { Cliente } from "@/lib/types";

export default async function ClientesPage() {
  const supabase = await createClient();

  const [clientesRes, vendasRes] = await Promise.all([
    supabase.from("clientes").select("*").order("nome"),
    supabase.from("vendas").select("cliente_id"),
  ]);

  const clientes = (clientesRes.data ?? []) as Cliente[];
  const pedidoCountByCliente: Record<string, number> = {};
  for (const v of vendasRes.data ?? []) {
    pedidoCountByCliente[v.cliente_id] = (pedidoCountByCliente[v.cliente_id] ?? 0) + 1;
  }

  return (
    <div>
      <h1 className="mb-8 font-display text-[32px] text-tinta">Clientes</h1>
      <ClientesModule clientes={clientes} pedidoCountByCliente={pedidoCountByCliente} />
    </div>
  );
}
