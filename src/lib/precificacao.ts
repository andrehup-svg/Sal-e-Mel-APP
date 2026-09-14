import type { CategoriaPreco } from "@/lib/types";

export function calcularValorItem(categoria: CategoriaPreco, quantidade: number): number {
  return categoria.tipo === "cento" ? categoria.preco * (quantidade / 100) : categoria.preco * quantidade;
}
