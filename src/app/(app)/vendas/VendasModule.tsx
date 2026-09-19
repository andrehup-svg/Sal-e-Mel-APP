"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import VendaFormModal from "./VendaFormModal";
import { excluirVenda } from "./actions";
import type { VendaComItens } from "./types";
import type { CategoriaPreco, Cliente, Produto } from "@/lib/types";

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
  clientes,
  produtos,
  categorias,
}: {
  vendas: VendaComItens[];
  recebidoMes: number;
  previstoMes: number;
  clientes: Cliente[];
  produtos: Produto[];
  categorias: CategoriaPreco[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<VendaComItens | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  async function excluir(venda: VendaComItens) {
    const nome = venda.clientes?.nome ?? "cliente";
    const confirmado = confirm(
      `Excluir a venda de ${nome} no valor de ${formatBRL(venda.valor_total)}? Essa ação não pode ser desfeita.`,
    );
    if (!confirmado) return;

    setErroExclusao(null);
    setExcluindoId(venda.id);
    const resultado = await excluirVenda(venda.id);
    setExcluindoId(null);

    if (resultado.error !== null) {
      setErroExclusao(resultado.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Card className="mb-6 max-w-sm">
        <div className="font-ui text-xs font-bold uppercase tracking-wide text-texto-suave">
          Recebido este mês
        </div>
        <div className="font-display text-3xl text-tinta">{formatBRL(recebidoMes)}</div>
        <div className="font-ui text-sm text-texto-medio">de {formatBRL(previstoMes)} previstos</div>
      </Card>

      {erroExclusao && (
        <p className="mb-4 font-ui text-[13px] font-semibold text-erro">{erroExclusao}</p>
      )}

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
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditando(venda)}>
                Editar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={excluindoId === venda.id}
                onClick={() => excluir(venda)}
              >
                {excluindoId === venda.id ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {editando && (
        <VendaFormModal
          key={editando.id}
          modo="editar"
          vendaEditando={{
            id: editando.id,
            cliente_id: editando.cliente_id,
            data_entrega: editando.data_entrega,
            sinal: editando.sinal,
            itens: editando.venda_itens.map((i) => ({
              produto_id: i.produto_id,
              quantidade: i.quantidade,
              modo: i.modo_preco,
            })),
          }}
          clientes={clientes}
          produtos={produtos}
          categorias={categorias}
          onFechar={() => setEditando(null)}
        />
      )}
    </div>
  );
}
