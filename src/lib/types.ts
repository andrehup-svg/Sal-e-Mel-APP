export type TipoPrecificacao = "cento" | "unidade";

export type CategoriaPreco = {
  id: string;
  nome: string;
  tipo: TipoPrecificacao;
  preco: number;
  created_at: string;
};

export type Produto = {
  id: string;
  nome: string;
  categoria_id: string;
  vendido_mes: number;
  created_at: string;
};
