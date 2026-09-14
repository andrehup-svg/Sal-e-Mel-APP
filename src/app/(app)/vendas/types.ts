export type VendaComItens = {
  id: string;
  data_entrega: string | null;
  valor_total: number;
  sinal: number;
  restante: number;
  status_pagamento: "Pago" | "Pendente";
  status_entrega: "Pendente" | "Entregue";
  created_at: string;
  clientes: { nome: string } | null;
  venda_itens: { quantidade: number; produtos: { nome: string } | null }[];
};
