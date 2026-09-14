"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { pagarFatura } from "./actions";
import { CompraAcoes } from "./CompraAcoes";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type CompraRow = {
  id: string;
  fornecedor: string;
  item: string | null;
  valor: number;
  pagamentoLabel: string;
  status: "Pago" | "Na fatura";
  parcelaLabel: string | null;
  dataCompraISO: string | null;
  podeEditar: boolean;
  podeExcluir: boolean;
};

export type ProximaCompra = {
  id: string;
  fornecedor: string;
  item: string | null;
  valorParcela: number;
  saldoDevedor: number;
  ultimaParcelaBR: string;
  podeExcluir: boolean;
};

export type FaturaAberta = {
  cartaoId: string;
  cartaoNome: string;
  mostrarNomeCartao: boolean;
  totalAtual: number;
  totalVencido: number;
  totalGeral: number;
  vencidoDesdeBR: string | null;
  ultimaCompetenciaVencidaISO: string | null;
  vencimentoBR: string;
  competenciaISO: string;
  saldoPrevisto: number;
  cobre: boolean;
  itens: CompraRow[];
  proximasCompras: ProximaCompra[];
};

export type FaturaPagaRow = {
  id: string;
  cartaoNome: string;
  valorTotal: number;
  dataPagamentoBR: string;
};

export default function ComprasModule({
  gastoMes,
  compras,
  faturasAbertas,
  faturasPagas,
}: {
  gastoMes: number;
  compras: CompraRow[];
  faturasAbertas: FaturaAberta[];
  faturasPagas: FaturaPagaRow[];
}) {
  const [aba, setAba] = useState<"lista" | "fatura">("lista");

  return (
    <div>
      <div className="mb-6 flex gap-2 border-b border-borda">
        <button
          type="button"
          onClick={() => setAba("lista")}
          className={`px-4 py-2 font-ui text-sm font-extrabold ${
            aba === "lista" ? "border-b-2 border-mel-500 text-tinta" : "text-texto-suave"
          }`}
        >
          Compras
        </button>
        <button
          type="button"
          onClick={() => setAba("fatura")}
          className={`px-4 py-2 font-ui text-sm font-extrabold ${
            aba === "fatura" ? "border-b-2 border-mel-500 text-tinta" : "text-texto-suave"
          }`}
        >
          Cartão de crédito
        </button>
      </div>

      {aba === "lista" ? (
        <div>
          <Card className="mb-6 max-w-sm">
            <div className="font-ui text-xs font-bold uppercase tracking-wide text-texto-suave">
              Gasto total no mês
            </div>
            <div className="font-display text-3xl text-tinta">{formatBRL(gastoMes)}</div>
          </Card>

          <div className="flex flex-col gap-3">
            {compras.length === 0 && (
              <p className="font-ui text-sm text-texto-medio">Nenhuma compra registrada ainda.</p>
            )}
            {compras.map((c) => (
              <div key={c.id} className="rounded-bloco border border-borda bg-papel px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-ui text-[15px] font-bold text-tinta">{c.fornecedor}</p>
                    <p className="truncate font-ui text-[13px] text-texto-suave">
                      {c.item ?? "—"} · {c.pagamentoLabel}
                      {c.parcelaLabel && ` · ${c.parcelaLabel}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-ui text-[15px] font-bold text-tinta">{formatBRL(c.valor)}</p>
                    <p
                      className={`font-ui text-[13px] font-semibold ${
                        c.status === "Pago" ? "text-sucesso" : "text-texto-suave"
                      }`}
                    >
                      {c.status}
                    </p>
                  </div>
                  <CompraAcoes
                    id={c.id}
                    fornecedor={c.fornecedor}
                    item={c.item}
                    valor={c.valor}
                    dataCompraISO={c.dataCompraISO}
                    parcelado={c.parcelaLabel !== null}
                    podeEditar={c.podeEditar}
                    podeExcluir={c.podeExcluir}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {faturasAbertas.length === 0 && (
            <p className="mb-6 font-ui text-sm text-texto-medio">Nenhuma fatura em aberto no momento.</p>
          )}
          {faturasAbertas.map((f) => (
            <div key={f.cartaoId} className="mb-6">
              {f.totalVencido > 0 && (
                <div className="mb-3 rounded-card border border-erro bg-erro/10 p-5">
                  <div className="font-ui text-xs font-bold uppercase tracking-wide text-erro">
                    Fatura vencida{f.mostrarNomeCartao && ` · ${f.cartaoNome}`}
                  </div>
                  <div className="font-display text-3xl text-erro">{formatBRL(f.totalVencido)}</div>
                  <div className="font-ui text-sm text-erro">Venceu em {f.vencidoDesdeBR}</div>
                  {f.ultimaCompetenciaVencidaISO && (
                    <PagarFaturaButton
                      cartaoId={f.cartaoId}
                      cartaoNome={f.mostrarNomeCartao ? f.cartaoNome : null}
                      valor={f.totalVencido}
                      competencia={f.ultimaCompetenciaVencidaISO}
                      rotulo="Marcar fatura vencida como paga"
                    />
                  )}
                </div>
              )}
              <div className="mb-3 rounded-card border border-borda bg-mel-100 p-5">
                <div className="font-ui text-xs font-bold uppercase tracking-wide text-cacau-600">
                  Fatura atual{f.mostrarNomeCartao && ` · ${f.cartaoNome}`}
                </div>
                {f.totalGeral > 0 ? (
                  <>
                    <div className="font-display text-3xl text-tinta">{formatBRL(f.totalAtual)}</div>
                    <div className="font-ui text-sm text-texto-medio">Vence em {f.vencimentoBR}</div>
                    <div className="mt-2 flex justify-between font-ui text-sm text-texto-medio">
                      <span>Saldo previsto até lá</span>
                      <span className="font-bold text-tinta">{formatBRL(f.saldoPrevisto)}</span>
                    </div>
                    <div
                      className={`mt-1 font-ui text-sm font-bold ${f.cobre ? "text-sucesso" : "text-erro"}`}
                    >
                      {f.cobre
                        ? "Dá pra cobrir a fatura"
                        : `Falta ${formatBRL(f.totalGeral - f.saldoPrevisto)}`}
                    </div>
                    <PagarFaturaButton
                      cartaoId={f.cartaoId}
                      cartaoNome={f.mostrarNomeCartao ? f.cartaoNome : null}
                      valor={f.totalGeral}
                      competencia={f.competenciaISO}
                      detalhe={f.totalVencido > 0 ? `inclui ${formatBRL(f.totalVencido)} vencido` : undefined}
                    />
                  </>
                ) : (
                  <p className="font-ui text-sm text-texto-medio">
                    Nenhuma parcela vencendo em {f.vencimentoBR}. Veja as próximas parcelas abaixo.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {f.itens.map((c) => (
                  <div key={c.id} className="rounded-bloco border border-borda bg-papel px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-ui text-[15px] font-bold text-tinta">{c.fornecedor}</p>
                        <p className="truncate font-ui text-[13px] text-texto-suave">
                          {c.item ?? "—"}
                          {c.parcelaLabel && ` · ${c.parcelaLabel}`}
                        </p>
                      </div>
                      <p className="shrink-0 font-ui text-[15px] font-bold text-tinta">
                        {formatBRL(c.valor)}
                      </p>
                      <CompraAcoes
                        id={c.id}
                        fornecedor={c.fornecedor}
                        item={c.item}
                        valor={c.valor}
                        dataCompraISO={c.dataCompraISO}
                        parcelado={c.parcelaLabel !== null}
                        podeEditar={c.podeEditar}
                        podeExcluir={c.podeExcluir}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {f.proximasCompras.length > 0 && (
                <div className="mt-3">
                  <Colapsavel titulo="Próximas parcelas">
                    <div className="flex flex-col gap-2">
                      {f.proximasCompras.map((c) => (
                        <div key={c.id} className="rounded-bloco border border-borda bg-papel px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-ui text-[15px] font-bold text-tinta">{c.fornecedor}</p>
                              <p className="truncate font-ui text-[13px] text-texto-suave">
                                {c.item ?? "—"}
                              </p>
                            </div>
                            <CompraAcoes
                              id={c.id}
                              fornecedor={c.fornecedor}
                              item={c.item}
                              valor={c.valorParcela}
                              dataCompraISO={null}
                              parcelado
                              podeEditar={false}
                              podeExcluir={c.podeExcluir}
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-3 border-t border-borda pt-2 font-ui text-[13px]">
                            <span className="text-texto-suave">Saldo devedor</span>
                            <span className="font-bold text-tinta">{formatBRL(c.saldoDevedor)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 font-ui text-[13px]">
                            <span className="text-texto-suave">Parcela</span>
                            <span className="font-bold text-tinta">{formatBRL(c.valorParcela)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 font-ui text-[13px]">
                            <span className="text-texto-suave">Última parcela em</span>
                            <span className="font-bold text-tinta">{c.ultimaParcelaBR}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Colapsavel>
                </div>
              )}
            </div>
          ))}

          <Colapsavel titulo="Faturas pagas">
            <div className="flex flex-col gap-2">
              {faturasPagas.length === 0 && (
                <p className="font-ui text-sm text-texto-medio">Nenhuma fatura paga ainda.</p>
              )}
              {faturasPagas.map((f) => (
                <div key={f.id} className="rounded-bloco border border-borda bg-papel px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-ui text-[15px] font-bold text-tinta">{f.cartaoNome}</p>
                      <p className="font-ui text-[13px] text-texto-suave">Paga em {f.dataPagamentoBR}</p>
                    </div>
                    <p className="font-ui text-[15px] font-bold text-tinta">{formatBRL(f.valorTotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Colapsavel>
        </div>
      )}
    </div>
  );
}

function Colapsavel({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="mb-2 flex w-full items-center justify-between gap-2 font-ui text-[13px] font-bold uppercase tracking-wide text-texto-suave"
      >
        {titulo}
        <span className={`transition-transform ${aberto ? "" : "-rotate-90"}`}>⌄</span>
      </button>
      {aberto && children}
    </div>
  );
}

function PagarFaturaButton({
  cartaoId,
  cartaoNome,
  valor,
  competencia,
  rotulo = "Marcar fatura como paga",
  detalhe,
}: {
  cartaoId: string;
  cartaoNome: string | null;
  valor: number;
  competencia: string;
  rotulo?: string;
  detalhe?: string;
}) {
  const [state, formAction, pending] = useActionState(pagarFatura, { error: null });
  const [confirmando, setConfirmando] = useState(false);
  const eraPending = useRef(false);

  useEffect(() => {
    if (eraPending.current && !pending && !state.error) {
      setConfirmando(false);
    }
    eraPending.current = pending;
  }, [pending, state]);

  return (
    <>
      <Button type="button" onClick={() => setConfirmando(true)} className="mt-3 w-full">
        {rotulo}
      </Button>
      {state.error && <p className="mt-2 font-ui text-[13px] font-semibold text-erro">{state.error}</p>}

      <Modal open={confirmando} onClose={() => setConfirmando(false)} widthClass="max-w-sm">
        <h3 className="font-display text-xl text-tinta">Marcar fatura como paga?</h3>
        <p className="mt-2 font-ui text-sm text-texto-medio">
          A fatura{cartaoNome && (
            <>
              {" "}
              de <span className="font-bold text-tinta">{cartaoNome}</span>
            </>
          )}{" "}
          ({formatBRL(valor)}
          {detalhe && ` — ${detalhe}`}) vai passar para &quot;Pago&quot;. Essa ação não pode ser desfeita.
        </p>
        <form action={formAction} className="mt-5 flex gap-3">
          <input type="hidden" name="cartao_id" value={cartaoId} />
          <input type="hidden" name="competencia" value={competencia} />
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmando(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={pending} className="flex-1">
            {pending ? "Marcando..." : "Confirmar"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
