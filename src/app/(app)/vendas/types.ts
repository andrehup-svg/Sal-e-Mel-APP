import type { TipoPrecificacao } from "@/lib/types";

export type VendaItemComProduto = {
  produto_id: string;
  quantidade: number;
  modo_preco: TipoPrecificacao;
  produtos: { nome: string } | null;
};

export type VendaComItens = {
  id: string;
  cliente_id: string;
  data_entrega: string | null;
  valor_total: number;
  sinal: number;
  restante: number;
  status_pagamento: "Pago" | "Pendente";
  status_entrega: "Pendente" | "Entregue";
  created_at: string;
  clientes: { nome: string; telefone: string | null } | null;
  venda_itens: VendaItemComProduto[];
};
