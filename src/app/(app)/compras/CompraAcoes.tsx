"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { editarCompra, excluirCompra } from "./actions";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Field, Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Modal } from "@/components/ui/Modal";

export function CompraAcoes({
  id,
  fornecedor,
  item,
  valor,
  dataCompraISO,
  parcelado,
  podeEditar,
  podeExcluir,
}: {
  id: string;
  fornecedor: string;
  item: string | null;
  valor: number;
  dataCompraISO: string | null;
  parcelado: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
}) {
  const [modo, setModo] = useState<"fechado" | "menu" | "editar" | "excluir">("fechado");

  if (!podeEditar && !podeExcluir) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setModo("menu")}
        aria-label="Mais opções"
        className="shrink-0 rounded-full px-2 py-1 font-ui text-lg leading-none text-texto-suave hover:bg-mel-100 hover:text-cacau-600"
      >
        ⋯
      </button>

      <Drawer open={modo === "menu"} onClose={() => setModo("fechado")} widthClass="sm:max-w-xs">
        <p className="mb-3 truncate font-ui text-sm font-bold text-tinta">{fornecedor}</p>
        <div className="flex flex-col divide-y divide-borda overflow-hidden rounded-bloco border border-borda">
          {podeEditar && (
            <button
              type="button"
              onClick={() => setModo("editar")}
              className="px-4 py-3.5 text-left font-ui text-[15px] font-bold text-tinta hover:bg-mel-100"
            >
              Editar
            </button>
          )}
          {podeExcluir && (
            <button
              type="button"
              onClick={() => setModo("excluir")}
              className="px-4 py-3.5 text-left font-ui text-[15px] font-bold text-erro hover:bg-erro/10"
            >
              Excluir
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setModo("fechado")}
          className="mt-3 w-full rounded-bloco border border-borda px-4 py-3.5 text-center font-ui text-[15px] font-bold text-texto-medio hover:bg-mel-100"
        >
          Cancelar
        </button>
      </Drawer>

      {podeEditar && (
        <EditarCompraModal
          key={modo === "editar" ? "aberto" : "fechado"}
          open={modo === "editar"}
          onClose={() => setModo("fechado")}
          id={id}
          fornecedor={fornecedor}
          item={item}
          valor={valor}
          dataCompraISO={dataCompraISO}
        />
      )}

      {podeExcluir && (
        <ExcluirCompraModal
          open={modo === "excluir"}
          onClose={() => setModo("fechado")}
          id={id}
          fornecedor={fornecedor}
          parcelado={parcelado}
        />
      )}
    </>
  );
}

function EditarCompraModal({
  open,
  onClose,
  id,
  fornecedor,
  item,
  valor,
  dataCompraISO,
}: {
  open: boolean;
  onClose: () => void;
  id: string;
  fornecedor: string;
  item: string | null;
  valor: number;
  dataCompraISO: string | null;
}) {
  const [state, formAction, pending] = useActionState(editarCompra, { error: null });
  const [valorEditado, setValorEditado] = useState(valor);
  const eraPending = useRef(false);

  useEffect(() => {
    if (eraPending.current && !pending && !state.error) {
      onClose();
    }
    eraPending.current = pending;
  }, [pending, state]);

  return (
    <Modal open={open} onClose={onClose} widthClass="max-w-md">
      <form action={formAction} className="flex flex-col gap-4">
        <h3 className="font-display text-xl text-tinta">Editar compra</h3>
        <input type="hidden" name="id" value={id} />

        <Field label="Fornecedor">
          <Input name="fornecedor" required defaultValue={fornecedor} />
        </Field>

        <Field label="Item">
          <Input name="item" defaultValue={item ?? ""} />
        </Field>

        <Field label="Valor">
          <MoneyInput value={valorEditado} onChange={setValorEditado} />
          <input type="hidden" name="valor" value={valorEditado} />
        </Field>

        <Field label="Data da compra">
          <Input type="date" name="data_compra" defaultValue={dataCompraISO ?? ""} required />
        </Field>

        {state.error && <p className="font-ui text-[13px] font-semibold text-erro">{state.error}</p>}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={pending} className="flex-1">
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ExcluirCompraModal({
  open,
  onClose,
  id,
  fornecedor,
  parcelado,
}: {
  open: boolean;
  onClose: () => void;
  id: string;
  fornecedor: string;
  parcelado: boolean;
}) {
  const [state, formAction, pending] = useActionState(excluirCompra, { error: null });
  const eraPending = useRef(false);

  useEffect(() => {
    if (eraPending.current && !pending && !state.error) {
      onClose();
    }
    eraPending.current = pending;
  }, [pending, state]);

  return (
    <Modal open={open} onClose={onClose} widthClass="max-w-sm">
      <h3 className="font-display text-xl text-tinta">Excluir compra?</h3>
      <p className="mt-2 font-ui text-sm text-texto-medio">
        A compra de <span className="font-bold text-tinta">{fornecedor}</span>
        {parcelado
          ? " e todas as parcelas dela ainda não pagas vão ser excluídas."
          : " vai ser excluída."}{" "}
        Essa ação não pode ser desfeita.
      </p>
      <form action={formAction} className="mt-5 flex gap-3">
        <input type="hidden" name="id" value={id} />
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Excluindo..." : "Excluir"}
        </Button>
      </form>
      {state.error && <p className="mt-2 font-ui text-[13px] font-semibold text-erro">{state.error}</p>}
    </Modal>
  );
}
