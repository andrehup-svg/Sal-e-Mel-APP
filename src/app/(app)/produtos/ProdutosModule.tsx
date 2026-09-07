"use client";

import { useMemo, useState } from "react";
import CategoriasSection from "./CategoriasSection";
import ProdutosSection from "./ProdutosSection";
import type { CategoriaPreco, Produto } from "@/lib/types";

export default function ProdutosModule({
  categorias,
  produtos,
}: {
  categorias: CategoriaPreco[];
  produtos: Produto[];
}) {
  const [aba, setAba] = useState<"categorias" | "produtos">("categorias");

  const produtoCountByCategoria = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of produtos) counts[p.categoria_id] = (counts[p.categoria_id] ?? 0) + 1;
    return counts;
  }, [produtos]);

  return (
    <div>
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setAba("categorias")}
          className={`rounded-full px-4 py-[7px] font-ui text-[13px] font-extrabold transition-colors ${
            aba === "categorias"
              ? "bg-mel-500 text-tinta"
              : "border-2 border-transparent text-texto-medio hover:bg-mel-100"
          }`}
        >
          Categorias
        </button>
        <button
          onClick={() => setAba("produtos")}
          className={`rounded-full px-4 py-[7px] font-ui text-[13px] font-extrabold transition-colors ${
            aba === "produtos"
              ? "bg-mel-500 text-tinta"
              : "border-2 border-transparent text-texto-medio hover:bg-mel-100"
          }`}
        >
          Produtos
        </button>
      </div>

      {aba === "categorias" ? (
        <CategoriasSection
          categorias={categorias}
          produtoCountByCategoria={produtoCountByCategoria}
        />
      ) : (
        <ProdutosSection produtos={produtos} categorias={categorias} />
      )}
    </div>
  );
}
