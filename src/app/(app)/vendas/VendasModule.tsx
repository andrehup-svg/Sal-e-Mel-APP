import { Card } from "@/components/ui/Card";
import type { VendaComItens } from "./types";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function itensResumo(venda: VendaComItens) {
  if (venda.venda_itens.length === 0) return "Sem itens";
  return venda.venda_itens
    .map((i) => `${i.quantidade} ${i.produtos?.nome.toLowerCase() ?? "item"}`)
    .join(" + ");
}

export default function VendasModule({
  vendas,
  recebidoMes,
  previstoMes,
}: {
  vendas: VendaComItens[];
  recebidoMes: number;
  previstoMes: number;
}) {
  return (
    <div>
      <Card className="mb-6 max-w-sm">
        <div className="font-ui text-xs font-bold uppercase tracking-wide text-texto-suave">
          Recebido este mês
        </div>
        <div className="font-display text-3xl text-tinta">{formatBRL(recebidoMes)}</div>
        <div className="font-ui text-sm text-texto-medio">de {formatBRL(previstoMes)} previstos</div>
      </Card>

      <div className="flex flex-col gap-3">
        {vendas.length === 0 && (
          <p className="font-ui text-sm text-texto-medio">Nenhuma venda registrada ainda.</p>
        )}
        {vendas.map((venda) => (
          <div key={venda.id} className="rounded-bloco border border-borda bg-papel px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-ui text-[15px] font-bold text-tinta">
                  {venda.clientes?.nome ?? "Cliente"}
                </p>
                <p className="truncate font-ui text-[13px] text-texto-suave">{itensResumo(venda)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-ui text-[15px] font-bold text-tinta">
                  {formatBRL(venda.valor_total)}
                </p>
                <p className="font-ui text-[13px] font-semibold text-texto-suave">
                  {venda.status_pagamento === "Pago" ? "Pago" : `Falta ${formatBRL(venda.restante)}`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
