"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { criarCompra } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Modal } from "@/components/ui/Modal";
import type { Cartao } from "@/lib/types";
import { formatMesAnoBR, primeiroDiaMes, somarMeses, sugestaoCompetencia, toISODate } from "@/lib/faturas";

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatBRLShort(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function NovaCompraForm({ cartoes }: { cartoes: Cartao[] }) {
  const [aberto, setAberto] = useState(false);
  const [pagamento, setPagamento] = useState<"pix" | "cartao">("pix");
  const [valor, setValor] = useState(0);
  const [cartaoId, setCartaoId] = useState(cartoes[0]?.id ?? "");
  const [parcelas, setParcelas] = useState(1);
  const [competencia, setCompetencia] = useState(() => toISODate(sugestaoCompetencia(new Date())));
  const [formKey, setFormKey] = useState(0);

  const [state, formAction, pending] = useActionState(criarCompra, { error: null });
  const eraPending = useRef(false);

  useEffect(() => {
    if (eraPending.current && !pending && !state.error) {
      fechar();
    }
    eraPending.current = pending;
  }, [pending, state]);

  function abrir() {
    setPagamento("pix");
    setValor(0);
    setCartaoId(cartoes[0]?.id ?? "");
    setParcelas(1);
    setCompetencia(toISODate(sugestaoCompetencia(new Date())));
    setAberto(true);
  }

  function fechar() {
    setAberto(false);
    setPagamento("pix");
    setValor(0);
    setCartaoId(cartoes[0]?.id ?? "");
    setParcelas(1);
    setCompetencia(toISODate(sugestaoCompetencia(new Date())));
    setFormKey((k) => k + 1);
  }

  function escolherPagamento(tipo: "pix" | "cartao") {
    setPagamento(tipo);
    if (tipo === "pix") setParcelas(1);
  }

  const mesAtualISO = toISODate(primeiroDiaMes(new Date()));
  const opcoesCompetencia = Array.from({ length: 15 }, (_, i) =>
    toISODate(somarMeses(primeiroDiaMes(new Date()), i - 3)),
  );

  return (
    <>
      <Button onClick={abrir}>Nova compra</Button>

      <Modal open={aberto} onClose={fechar} widthClass="max-w-md" closeOnBackdropClick={false}>
        <form key={formKey} action={formAction} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-tinta">Nova compra</h3>
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-mel-100 font-ui text-sm text-cacau-600 hover:bg-mel-200"
            >
              ✕
            </button>
          </div>

          <Field label="Fornecedor">
            <Input name="fornecedor" required placeholder="Ex: Atacadão Doce & Mel" />
          </Field>

          <Field label="Item">
            <Input name="item" placeholder="Ex: Leite condensado, chocolate" />
          </Field>

          <Field label="Valor">
            <MoneyInput value={valor} onChange={setValor} />
            <input type="hidden" name="valor" value={valor} />
          </Field>

          <Field label="Forma de pagamento">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => escolherPagamento("pix")}
                className={`flex-1 rounded-input border-2 px-4 py-2.5 font-ui text-sm font-bold ${
                  pagamento === "pix"
                    ? "border-mel-500 bg-mel-500 text-tinta"
                    : "border-borda bg-white text-texto-medio"
                }`}
              >
                Pix
              </button>
              <button
                type="button"
                onClick={() => escolherPagamento("cartao")}
                className={`flex-1 rounded-input border-2 px-4 py-2.5 font-ui text-sm font-bold ${
                  pagamento === "cartao"
                    ? "border-mel-500 bg-mel-500 text-tinta"
                    : "border-borda bg-white text-texto-medio"
                }`}
              >
                Cartão de crédito
              </button>
            </div>
            <input type="hidden" name="forma_pagamento" value={pagamento} />
            {pagamento === "cartao" && cartoes.length === 1 && (
              <input type="hidden" name="cartao_id" value={cartoes[0].id} />
            )}
          </Field>

          {pagamento === "cartao" && cartoes.length === 0 && (
            <p className="font-ui text-[13px] font-semibold text-erro">
              Nenhum cartão de crédito cadastrado.
            </p>
          )}

          {pagamento === "cartao" && cartoes.length > 1 && (
            <Field label="Cartão">
              <Select name="cartao_id" value={cartaoId} onChange={(e) => setCartaoId(e.target.value)}>
                {cartoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {pagamento === "cartao" && (
            <Field label="Parcelas">
              <Select
                name="parcelas"
                value={parcelas}
                onChange={(e) => setParcelas(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "À vista (1x)" : `${n}x de ${formatBRLShort(valor / n)}`}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {pagamento === "cartao" && (
            <Field label={parcelas > 1 ? "Fatura da 1ª parcela" : "Fatura"}>
              <Select name="competencia" value={competencia} onChange={(e) => setCompetencia(e.target.value)}>
                {opcoesCompetencia.map((iso) => (
                  <option key={iso} value={iso}>
                    {formatMesAnoBR(iso)}
                    {iso === mesAtualISO ? " (atual)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Data da compra">
            <Input type="date" name="data_compra" defaultValue={hojeISO()} required />
          </Field>

          {state.error && <p className="font-ui text-[13px] font-semibold text-erro">{state.error}</p>}

          <Button
            type="submit"
            disabled={pending || (pagamento === "cartao" && cartoes.length === 0)}
            className="w-full"
          >
            {pending ? "Salvando..." : "Salvar compra"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
