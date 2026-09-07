import { createClient } from "@/lib/supabase/server";
import ProdutosModule from "./ProdutosModule";
import type { CategoriaPreco, Produto } from "@/lib/types";

export default async function ProdutosPage() {
  const supabase = await createClient();

  const [categoriasRes, produtosRes] = await Promise.all([
    supabase.from("categorias_preco").select("*").order("nome"),
    supabase.from("produtos").select("*").order("nome"),
  ]);

  const categorias = (categoriasRes.data ?? []) as CategoriaPreco[];
  const produtos = (produtosRes.data ?? []) as Produto[];

  return (
    <div>
      <h1 className="mb-8 font-display text-[32px] text-tinta">
        Produtos e Categorias de Preço
      </h1>
      <ProdutosModule categorias={categorias} produtos={produtos} />
    </div>
  );
}
