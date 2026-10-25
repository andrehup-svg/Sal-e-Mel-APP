"use client";

import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { criarItem, editarItem, removerItem, definirQuantidade } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import type { ItemEstoque } from "@/lib/types";

const UNIDADES = ["un", "kg", "g", "L", "ml", "pacote", "caixa"];

function formatQtd(v: number) {
  return String(Math.round(v * 100) / 100).replace(".", ",");
}

const precisaComprar = (i: ItemEstoque) => i.quantidade < i.minimo;

export default function EstoqueModule({ itens }: { itens: ItemEstoque[] }) {
  const [editando, setEditando] = useState<ItemEstoque | null>(null);
  const [formKey, setFormKey] = useState(0);

  const action = editando ? editarItem : criarItem;
  const [state, formAction, pending] = useActionState(action, { error: null });
  const eraPending = useRef(false);

  useEffect(() => {
    if (eraPending.current && !pending && !state.error) {
      setEditando(null);
      setFormKey((k) => k + 1);
    }
    eraPending.current = pending;
  }, [pending, state]);

  const [otimistas, ajustarOtimista] = useOptimistic(
    itens,
    (atual, { id, quantidade }: { id: string; quantidade: number }) =>
      atual.map((i) => (i.id === id ? { ...i, quantidade } : i)),
  );
  const [, startTransition] = useTransition();
  const [erroAjuste, setErroAjuste] = useState<string | null>(null);

  const ordenados = [...otimistas].sort((a, b) => {
    const pa = precisaComprar(a);
    const pb = precisaComprar(b);
    if (pa !== pb) return pa ? -1 : 1;
    return a.nome.localeCompare(b.nome);
  });
  const faltando = otimistas.filter(precisaComprar);

  function ajustar(item: ItemEstoque, delta: number) {
    const quantidade = Math.max(0, Math.round((item.quantidade + delta) * 100) / 100);
    setErroAjuste(null);
    startTransition(async () => {
      ajustarOtimista({ id: item.id, quantidade });
      const res = await definirQuantidade(item.id, quantidade);
      if (res.error) setErroAjuste(res.error);
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-1">
          <p className="font-ui text-xs font-extrabold text-texto-suave uppercase tracking-wide">
            {faltando.length === 0 ? "Lista de compras" : "Precisa comprar"}
          </p>
          <p className="font-display text-[22px] text-tinta">
            {faltando.length === 0
              ? "Tudo em dia"
              : `${faltando.length} ${faltando.length === 1 ? "item" : "itens"}`}
          </p>
          <p className="font-ui text-[13px] text-texto-medio">
            {faltando.length === 0
              ? "Nenhum insumo abaixo do mínimo agora."
              : faltando.map((i) => i.nome).join(", ")}
          </p>
        </Card>

        <form
          key={editando ? `edit-${editando.id}` : `novo-${formKey}`}
          action={formAction}
          className="flex flex-col gap-4"
        >
          <Card className="flex flex-col gap-4">
            <h3 className="font-ui text-sm font-extrabold text-texto-suave uppercase tracking-wide">
              {editando ? `Editando: ${editando.nome}` : "Novo item"}
            </h3>

            {editando && <input type="hidden" name="id" value={editando.id} />}

            <Field label="Nome do insumo">
              <Input name="nome" defaultValue={editando?.nome ?? ""} required placeholder="Ex: Farinha de trigo" />
            </Field>

            <div className="flex gap-3">
              <div className="flex-1">
                <Field label="Quantidade atual">
                  <Input
                    name="quantidade"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={editando?.quantidade ?? ""}
                  />
                </Field>
              </div>
              <div className="w-32">
                <Field label="Unidade">
                  <Select name="unidade" defaultValue={editando?.unidade ?? "un"}>
                    {UNIDADES.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

            <Field label="Mínimo desejado">
              <Input
                name="minimo"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                required
                defaultValue={editando?.minimo ?? ""}
              />
            </Field>

            {state.error && <p className="font-ui text-[13px] font-semibold text-erro">{state.error}</p>}

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={pending} className="flex-1">
                {editando ? "Salvar alterações" : "Adicionar item"}
              </Button>
              {editando && (
                <Button type="button" variant="ghost" onClick={() => setEditando(null)}>
                  Cancelar
                </Button>
              )}
            </div>
          </Card>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-ui text-sm font-extrabold text-texto-suave uppercase tracking-wide">
          Itens cadastrados
        </h3>
        {erroAjuste && <p className="font-ui text-[13px] font-semibold text-erro">{erroAjuste}</p>}
        {ordenados.length === 0 && (
          <p className="font-ui text-sm text-texto-medio">Nenhum item cadastrado ainda.</p>
        )}
        {ordenados.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onAjustar={(delta) => ajustar(item, delta)}
            onEditar={() => setEditando(item)}
          />
        ))}
      </div>
    </div>
  );
}

function ItemRow({
  item,
  onAjustar,
  onEditar,
}: {
  item: ItemEstoque;
  onAjustar: (delta: number) => void;
  onEditar: () => void;
}) {
  const [state, formAction, pending] = useActionState(removerItem, { error: null });
  const falta = precisaComprar(item);

  return (
    <div className="rounded-bloco border border-borda bg-papel px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-ui text-[15px] font-bold text-tinta">{item.nome}</p>
          <p className="font-ui text-[13px] text-texto-suave">
            Mínimo: {formatQtd(item.minimo)} {item.unidade}
          </p>
        </div>
        <Tag variant={falta ? "destaque" : "restricao"}>{falta ? "Comprar" : "Em estoque"}</Tag>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" aria-label="Diminuir" onClick={() => onAjustar(-1)}>
            −
          </Button>
          <span className="min-w-[72px] text-center font-ui text-sm font-bold text-tinta">
            {formatQtd(item.quantidade)} {item.unidade}
          </span>
          <Button type="button" variant="outline" size="sm" aria-label="Aumentar" onClick={() => onAjustar(1)}>
            +
          </Button>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEditar}>
            Editar
          </Button>
          <form
            action={formAction}
            onSubmit={(e) => {
              if (!confirm(`Remover "${item.nome}" do estoque?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={item.id} />
            <Button type="submit" variant="outline" size="sm" disabled={pending}>
              Remover
            </Button>
          </form>
        </div>
      </div>
      {state.error && <p className="mt-2 font-ui text-[13px] font-semibold text-erro">{state.error}</p>}
    </div>
  );
}
