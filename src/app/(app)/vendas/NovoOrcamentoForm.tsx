"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import VendaFormModal from "./VendaFormModal";
import type { CategoriaPreco, Cliente, Produto } from "@/lib/types";

export default function NovoOrcamentoForm({
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
      <Button variant="outline" onClick={() => setAberto(true)}>
        Novo orçamento
      </Button>
      {aberto && (
        <VendaFormModal
          modo="orcamento"
          clientes={clientes}
          produtos={produtos}
          categorias={categorias}
          onFechar={() => setAberto(false)}
        />
      )}
    </>
  );
}
