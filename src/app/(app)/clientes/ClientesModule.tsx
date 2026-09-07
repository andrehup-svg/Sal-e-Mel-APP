"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { criarCliente, editarCliente, removerCliente } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { maskTelefone } from "@/lib/telefone";
import type { Cliente } from "@/lib/types";

export default function ClientesModule({
  clientes,
  pedidoCountByCliente,
}: {
  clientes: Cliente[];
  pedidoCountByCliente: Record<string, number>;
}) {
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [formKey, setFormKey] = useState(0);

  const action = editando ? editarCliente : criarCliente;
  const [state, formAction, pending] = useActionState(action, { error: null });
  const eraPending = useRef(false);

  useEffect(() => {
    if (eraPending.current && !pending && !state.error) {
      setEditando(null);
      setFormKey((k) => k + 1);
    }
    eraPending.current = pending;
  }, [pending, state]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form
        key={editando ? `edit-${editando.id}` : `novo-${formKey}`}
        action={formAction}
        className="flex flex-col gap-4"
      >
        <Card className="flex flex-col gap-4">
          <h3 className="font-ui text-sm font-extrabold text-texto-suave uppercase tracking-wide">
            {editando ? `Editando: ${editando.nome}` : "Novo cliente"}
          </h3>

          {editando && <input type="hidden" name="id" value={editando.id} />}

          <Field label="Nome">
            <Input name="nome" defaultValue={editando?.nome ?? ""} required placeholder="Ex: Juliana Alves" />
          </Field>

          <Field label="Telefone">
            <Input
              name="telefone"
              inputMode="tel"
              defaultValue={editando?.telefone ?? ""}
              placeholder="(11) 90000-0000"
              autoComplete="off"
              maxLength={15}
              onInput={(e) => {
                e.currentTarget.value = maskTelefone(e.currentTarget.value);
              }}
            />
          </Field>

          {state.error && <p className="font-ui text-[13px] font-semibold text-erro">{state.error}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={pending} className="flex-1">
              {editando ? "Salvar alterações" : "Adicionar cliente"}
            </Button>
            {editando && (
              <Button type="button" variant="ghost" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
            )}
          </div>
        </Card>
      </form>

      <div className="flex flex-col gap-3">
        <h3 className="font-ui text-sm font-extrabold text-texto-suave uppercase tracking-wide">
          Clientes cadastrados
        </h3>
        {clientes.length === 0 && (
          <p className="font-ui text-sm text-texto-medio">Nenhum cliente cadastrado ainda.</p>
        )}
        {clientes.map((cliente) => (
          <ClienteRow
            key={cliente.id}
            cliente={cliente}
            pedidos={pedidoCountByCliente[cliente.id] ?? 0}
            onEditar={() => setEditando(cliente)}
          />
        ))}
      </div>
    </div>
  );
}

function ClienteRow({
  cliente,
  pedidos,
  onEditar,
}: {
  cliente: Cliente;
  pedidos: number;
  onEditar: () => void;
}) {
  const [state, formAction, pending] = useActionState(removerCliente, { error: null });

  return (
    <div className="rounded-bloco border border-borda bg-papel px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/clientes/${cliente.id}`} className="min-w-0 flex-1 no-underline">
          <p className="font-ui text-[15px] font-bold text-tinta">{cliente.nome}</p>
          <p className="font-ui text-[13px] text-texto-suave">
            {cliente.telefone || "Sem telefone"} · {pedidos} pedido(s)
          </p>
        </Link>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEditar}>
            Editar
          </Button>
          <form
            action={formAction}
            onSubmit={(e) => {
              if (!confirm(`Remover o cliente "${cliente.nome}"?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={cliente.id} />
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
