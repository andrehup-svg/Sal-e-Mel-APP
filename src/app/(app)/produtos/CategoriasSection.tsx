"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { criarCategoria, editarCategoria, removerCategoria } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Card } from "@/components/ui/Card";
import { sugerirPrecoUnidade } from "@/lib/precificacao";
import type { CategoriaPreco } from "@/lib/types";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CategoriasSection({
  categorias,
  produtoCountByCategoria,
}: {
  categorias: CategoriaPreco[];
  produtoCountByCategoria: Record<string, number>;
}) {
  const [editando, setEditando] = useState<CategoriaPreco | null>(null);
  const [tipo, setTipo] = useState<"cento" | "unidade">("cento");
  const [precoCento, setPrecoCento] = useState(0);
  const [precoUnidade, setPrecoUnidade] = useState(0);
  const [precoUnidadeManual, setPrecoUnidadeManual] = useState(false);
  const [temAtacado, setTemAtacado] = useState(false);
  const [precoAtacado, setPrecoAtacado] = useState(0);
  const [qtdMinAtacado, setQtdMinAtacado] = useState("");
  const [formKey, setFormKey] = useState(0);

  const action = editando ? editarCategoria : criarCategoria;
  const [state, formAction, pending] = useActionState(action, { error: null });
  const eraPending = useRef(false);

  useEffect(() => {
    if (eraPending.current && !pending && !state.error) {
      setEditando(null);
      setTipo("cento");
      setPrecoCento(0);
      setPrecoUnidade(0);
      setPrecoUnidadeManual(false);
      setTemAtacado(false);
      setPrecoAtacado(0);
      setQtdMinAtacado("");
      setFormKey((k) => k + 1);
    }
    eraPending.current = pending;
  }, [pending, state]);

  function iniciarEdicao(cat: CategoriaPreco) {
    setEditando(cat);
    setTipo(cat.tipo);
    setPrecoCento(cat.preco_cento ?? 0);
    setPrecoUnidade(cat.preco_unidade);
    setPrecoUnidadeManual(true);
    setTemAtacado(cat.preco_unidade_atacado !== null);
    setPrecoAtacado(cat.preco_unidade_atacado ?? 0);
    setQtdMinAtacado(cat.quantidade_minima_atacado !== null ? String(cat.quantidade_minima_atacado) : "");
  }

  function cancelarEdicao() {
    setEditando(null);
    setTipo("cento");
    setPrecoCento(0);
    setPrecoUnidade(0);
    setPrecoUnidadeManual(false);
    setTemAtacado(false);
    setPrecoAtacado(0);
    setQtdMinAtacado("");
  }

  function mudarPrecoCento(valor: number) {
    setPrecoCento(valor);
    if (!precoUnidadeManual) {
      setPrecoUnidade(valor > 0 ? sugerirPrecoUnidade(valor) : 0);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form
        key={editando ? `edit-${editando.id}` : `novo-${formKey}`}
        action={formAction}
        className="flex flex-col gap-4"
      >
        <Card className="flex flex-col gap-4">
          <h3 className="font-ui text-sm font-extrabold text-texto-suave uppercase tracking-wide">
            {editando ? `Editando: ${editando.nome}` : "Nova categoria"}
          </h3>

          {editando && <input type="hidden" name="id" value={editando.id} />}

          <Field label="Nome">
            <Input name="nome" defaultValue={editando?.nome ?? ""} required placeholder="Ex: Doces especiais" />
          </Field>

          <Field label="Como precifica">
            <Select
              name="tipo"
              value={tipo}
              onChange={(e) => {
                const novoTipo = e.target.value as "cento" | "unidade";
                setTipo(novoTipo);
                if (novoTipo === "unidade") {
                  setPrecoCento(0);
                  setPrecoUnidadeManual(true);
                } else {
                  setPrecoUnidadeManual(false);
                  mudarPrecoCento(precoCento);
                }
              }}
            >
              <option value="cento">Por cento (100 unidades)</option>
              <option value="unidade">Por unidade (sob encomenda)</option>
            </Select>
          </Field>

          {tipo === "cento" && (
            <Field label="Preço por 100 unidades (R$)">
              <MoneyInput value={precoCento} onChange={mudarPrecoCento} />
              <input type="hidden" name="preco_cento" value={precoCento} />
            </Field>
          )}

          <Field
            label={
              tipo === "cento" ? "Preço por unidade avulsa (R$)" : "Preço por unidade (R$)"
            }
          >
            <MoneyInput
              value={precoUnidade}
              onChange={(valor) => {
                setPrecoUnidade(valor);
                setPrecoUnidadeManual(true);
              }}
            />
            <input type="hidden" name="preco_unidade" value={precoUnidade} />
          </Field>
          {tipo === "cento" && !precoUnidadeManual && precoCento > 0 && (
            <p className="-mt-2 font-ui text-[12px] text-texto-suave">
              Sugerido automaticamente: cento ÷ 100 + R$ 0,10. Edite se quiser um valor diferente.
            </p>
          )}

          <label className="flex items-center gap-2 font-ui text-sm text-tinta">
            <input
              type="checkbox"
              checked={temAtacado}
              onChange={(e) => {
                setTemAtacado(e.target.checked);
                if (!e.target.checked) {
                  setPrecoAtacado(0);
                  setQtdMinAtacado("");
                }
              }}
            />
            Tem preço de atacado por quantidade (ex: Morango Cravejado)
          </label>

          {temAtacado && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço de atacado (R$)">
                <MoneyInput value={precoAtacado} onChange={setPrecoAtacado} />
                <input type="hidden" name="preco_unidade_atacado" value={precoAtacado} />
              </Field>
              <Field label="Acima de quantas unidades">
                <Input
                  name="quantidade_minima_atacado"
                  type="number"
                  min="0"
                  step="1"
                  value={qtdMinAtacado}
                  onChange={(e) => setQtdMinAtacado(e.target.value)}
                />
              </Field>
            </div>
          )}

          {state.error && <p className="font-ui text-[13px] font-semibold text-erro">{state.error}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={pending} className="flex-1">
              {editando ? "Salvar alterações" : "Adicionar categoria"}
            </Button>
            {editando && (
              <Button type="button" variant="ghost" onClick={cancelarEdicao}>
                Cancelar
              </Button>
            )}
          </div>
        </Card>
      </form>

      <div className="flex flex-col gap-3">
        <h3 className="font-ui text-sm font-extrabold text-texto-suave uppercase tracking-wide">
          Categorias cadastradas
        </h3>
        {categorias.length === 0 && (
          <p className="font-ui text-sm text-texto-medio">Nenhuma categoria cadastrada ainda.</p>
        )}
        {categorias.map((cat) => (
          <CategoriaRow
            key={cat.id}
            categoria={cat}
            emUso={(produtoCountByCategoria[cat.id] ?? 0) > 0}
            onEditar={() => iniciarEdicao(cat)}
          />
        ))}
      </div>
    </div>
  );
}

function CategoriaRow({
  categoria,
  emUso,
  onEditar,
}: {
  categoria: CategoriaPreco;
  emUso: boolean;
  onEditar: () => void;
}) {
  const [state, formAction, pending] = useActionState(removerCategoria, { error: null });

  return (
    <div className="rounded-bloco border border-borda bg-papel px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-ui text-[15px] font-bold text-tinta">{categoria.nome}</p>
          <p className="font-ui text-[13px] text-texto-suave">
            {categoria.tipo === "cento"
              ? `${formatBRL(categoria.preco_cento ?? 0)} /cento · ${formatBRL(categoria.preco_unidade)} /un avulsa`
              : `${formatBRL(categoria.preco_unidade)} /unidade`}
            {categoria.preco_unidade_atacado !== null && categoria.quantidade_minima_atacado !== null && (
              <> · {formatBRL(categoria.preco_unidade_atacado)} /un acima de {categoria.quantidade_minima_atacado}un</>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEditar}>
            Editar
          </Button>
          <form
            action={formAction}
            onSubmit={(e) => {
              if (!confirm(`Remover a categoria "${categoria.nome}"?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={categoria.id} />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={pending || emUso}
              title={emUso ? "Categoria em uso por produtos" : undefined}
            >
              Remover
            </Button>
          </form>
        </div>
      </div>
      {state.error && <p className="mt-2 font-ui text-[13px] font-semibold text-erro">{state.error}</p>}
    </div>
  );
}
