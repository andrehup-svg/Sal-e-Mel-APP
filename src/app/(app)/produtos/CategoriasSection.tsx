"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { criarCategoria, editarCategoria, removerCategoria } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
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
  const [formKey, setFormKey] = useState(0);

  const action = editando ? editarCategoria : criarCategoria;
  const [state, formAction, pending] = useActionState(action, { error: null });
  const eraPending = useRef(false);

  useEffect(() => {
    if (eraPending.current && !pending && !state.error) {
      setEditando(null);
      setTipo("cento");
      setFormKey((k) => k + 1);
    }
    eraPending.current = pending;
  }, [pending, state]);

  function iniciarEdicao(cat: CategoriaPreco) {
    setEditando(cat);
    setTipo(cat.tipo);
  }

  function cancelarEdicao() {
    setEditando(null);
    setTipo("cento");
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
              onChange={(e) => setTipo(e.target.value as "cento" | "unidade")}
            >
              <option value="cento">Por cento (100 unidades)</option>
              <option value="unidade">Por unidade</option>
            </Select>
          </Field>

          <Field label={tipo === "cento" ? "Preço por 100 unidades (R$)" : "Preço por unidade (R$)"}>
            <Input name="preco" type="number" min="0" step="0.01" defaultValue={editando?.preco ?? ""} />
          </Field>

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
            {formatBRL(categoria.preco)} {categoria.tipo === "cento" ? "/cento" : "/unidade"}
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
