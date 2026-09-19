"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { criarProduto, editarProduto, removerProduto } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { CategoriaPreco, Produto } from "@/lib/types";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function precoLabel(produto: Produto, categorias: CategoriaPreco[]) {
  const cat = categorias.find((c) => c.id === produto.categoria_id);
  if (!cat) return "—";
  return cat.tipo === "cento"
    ? `${formatBRL(cat.preco_cento ?? 0)} /cento · ${formatBRL(cat.preco_unidade)} /un avulsa · ${cat.nome}`
    : `${formatBRL(cat.preco_unidade)} /un · ${cat.nome}`;
}

function categoriaOptionLabel(cat: CategoriaPreco) {
  return cat.tipo === "cento"
    ? `${cat.nome} — ${formatBRL(cat.preco_cento ?? 0)} /cento`
    : `${cat.nome} — ${formatBRL(cat.preco_unidade)} /un`;
}

export default function ProdutosSection({
  produtos,
  categorias,
}: {
  produtos: Produto[];
  categorias: CategoriaPreco[];
}) {
  const [editando, setEditando] = useState<Produto | null>(null);
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? "");
  const [formKey, setFormKey] = useState(0);

  const action = editando ? editarProduto : criarProduto;
  const [state, formAction, pending] = useActionState(action, { error: null });
  const eraPending = useRef(false);

  useEffect(() => {
    if (eraPending.current && !pending && !state.error) {
      setEditando(null);
      setCategoriaId(categorias[0]?.id ?? "");
      setFormKey((k) => k + 1);
    }
    eraPending.current = pending;
  }, [pending, state, categorias]);

  function iniciarEdicao(produto: Produto) {
    setEditando(produto);
    setCategoriaId(produto.categoria_id);
  }

  if (categorias.length === 0) {
    return (
      <div className="rounded-card border-2 border-dashed border-mel-500 bg-mel-100 p-6">
        <p className="font-ui text-sm text-texto-medio">
          Cadastre uma categoria de preço antes de adicionar produtos.
        </p>
      </div>
    );
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
            {editando ? `Editando: ${editando.nome}` : "Novo produto"}
          </h3>

          {editando && <input type="hidden" name="id" value={editando.id} />}

          <Field label="Nome">
            <Input name="nome" defaultValue={editando?.nome ?? ""} required placeholder="Ex: Cajuzinho" />
          </Field>

          <Field label="Categoria de preço">
            <Select
              name="categoria_id"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {categoriaOptionLabel(cat)}
                </option>
              ))}
            </Select>
          </Field>

          {state.error && <p className="font-ui text-[13px] font-semibold text-erro">{state.error}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={pending} className="flex-1">
              {editando ? "Salvar alterações" : "Adicionar produto"}
            </Button>
            {editando && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditando(null);
                  setCategoriaId(categorias[0]?.id ?? "");
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </Card>
      </form>

      <div className="flex flex-col gap-3">
        <h3 className="font-ui text-sm font-extrabold text-texto-suave uppercase tracking-wide">
          Produtos cadastrados
        </h3>
        {produtos.length === 0 && (
          <p className="font-ui text-sm text-texto-medio">Nenhum produto cadastrado ainda.</p>
        )}
        {produtos.map((produto) => (
          <ProdutoRow
            key={produto.id}
            produto={produto}
            label={precoLabel(produto, categorias)}
            onEditar={() => iniciarEdicao(produto)}
          />
        ))}
      </div>
    </div>
  );
}

function ProdutoRow({
  produto,
  label,
  onEditar,
}: {
  produto: Produto;
  label: string;
  onEditar: () => void;
}) {
  const [state, formAction, pending] = useActionState(removerProduto, { error: null });

  return (
    <div className="rounded-bloco border border-borda bg-papel px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-ui text-[15px] font-bold text-tinta">{produto.nome}</p>
          <p className="font-ui text-[13px] text-texto-suave">
            {label} · vendido no mês: {produto.vendido_mes}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEditar}>
            Editar
          </Button>
          <form
            action={formAction}
            onSubmit={(e) => {
              if (!confirm(`Remover o produto "${produto.nome}"?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={produto.id} />
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
