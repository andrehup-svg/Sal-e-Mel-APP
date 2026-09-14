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

export type Cartao = {
  id: string;
  nome: string;
  dia_vencimento: number;
};

export type FaturaPaga = {
  id: string;
  cartao_id: string;
  valor_total: number;
  data_pagamento: string;
};

export type FormaPagamento = "pix" | "cartao";
export type StatusCompra = "Pago" | "Na fatura";

export type Compra = {
  id: string;
  fornecedor: string;
  item: string | null;
  valor: number;
  forma_pagamento: FormaPagamento;
  cartao_id: string | null;
  status: StatusCompra;
  data_compra: string | null;
  competencia: string;
  grupo_compra_id: string | null;
  numero_parcela: number;
  total_parcelas: number;
  created_at: string;
};

export type ParametrosDivisao = {
  id: number;
  percentual_socia: number;
};
