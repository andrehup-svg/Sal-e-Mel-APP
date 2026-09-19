import type { CategoriaPreco, TipoPrecificacao } from "@/lib/types";

export function sugerirPrecoUnidade(precoCento: number): number {
  return Math.round((precoCento / 100 + 0.1) * 100) / 100;
}

export function precoUnidadeEfetivo(categoria: CategoriaPreco, quantidade: number): number {
  if (
    categoria.preco_unidade_atacado !== null &&
    categoria.quantidade_minima_atacado !== null &&
    quantidade > categoria.quantidade_minima_atacado
  ) {
    return categoria.preco_unidade_atacado;
  }
  return categoria.preco_unidade;
}

export function calcularValorItem(
  categoria: CategoriaPreco,
  quantidade: number,
  modo: TipoPrecificacao,
): number {
  if (modo === "cento") {
    if (categoria.preco_cento === null) {
      throw new Error("Esta categoria não vende por cento.");
    }
    return categoria.preco_cento * (quantidade / 100);
  }
  return precoUnidadeEfetivo(categoria, quantidade) * quantidade;
}
