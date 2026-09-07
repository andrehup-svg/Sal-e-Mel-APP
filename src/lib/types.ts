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

export type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  created_at: string;
};

export type StatusPagamento = "Pago" | "Pendente";
export type StatusEntrega = "Pendente" | "Entregue";

export type Venda = {
  id: string;
  cliente_id: string;
  data_entrega: string | null;
  valor_total: number;
  sinal: number;
  restante: number;
  status_pagamento: StatusPagamento;
  status_entrega: StatusEntrega;
  created_at: string;
};
