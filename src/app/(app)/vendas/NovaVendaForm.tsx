"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import VendaFormModal from "./VendaFormModal";
import type { CategoriaPreco, Cliente, Produto } from "@/lib/types";

export default function NovaVendaForm({
  clientes,
  produtos,
  categorias,
}: {
  clientes: Cliente[];
  produtos: Produto[];
  categorias: CategoriaPreco[];
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <Button onClick={() => setAberto(true)}>Nova venda</Button>
      {aberto && (
        <VendaFormModal
          modo="criar"
          clientes={clientes}
          produtos={produtos}
          categorias={categorias}
          onFechar={() => setAberto(false)}
        />
      )}
    </>
  );
}
