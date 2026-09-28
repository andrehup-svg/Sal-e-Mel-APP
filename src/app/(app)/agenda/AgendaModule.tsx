"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Tag } from "@/components/ui/Tag";
import { atualizarDataEntrega, marcarEntregue } from "./actions";
import { confirmarRecebimentoRestante } from "../vendas/actions";
import type { VendaComItens } from "../vendas/types";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DOWS = ["D", "S", "T", "Q", "Q", "S", "S"];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDataCurta(iso: string) {
  const d = parseISODate(iso);
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return `${dias[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3).toLowerCase()}`;
}

function formatDataLonga(iso: string) {
  const d = parseISODate(iso);
  return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()}`;
}

function diasRelativos(iso: string, hojeISO: string) {
  const hoje = parseISODate(hojeISO);
  const d = parseISODate(iso);
  const diff = Math.round((d.getTime() - hoje.getTime()) / 86_400_000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff > 1 && diff < 7) return `Em ${diff} dias`;
  return formatDataCurta(iso);
}

function itensResumo(venda: VendaComItens) {
  if (venda.venda_itens.length === 0) return "Sem itens";
  return venda.venda_itens
    .map((i) => `${i.quantidade} ${i.produtos?.nome.toLowerCase() ?? "item"}`)
    .join(" + ");
}

export default function AgendaModule({
  vendas,
  hojeISO,
}: {
  vendas: VendaComItens[];
  hojeISO: string;
}) {
  const router = useRouter();

  const [mesAtual, setMesAtual] = useState(() => {
    const hoje = parseISODate(hojeISO);
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  });
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [vendaDetalhe, setVendaDetalhe] = useState<VendaComItens | null>(null);
  const [novaData, setNovaData] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [salvandoData, setSalvandoData] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const [confirmandoPagamento, setConfirmandoPagamento] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const vendasPorDia = useMemo(() => {
    const map = new Map<string, VendaComItens[]>();
    for (const v of vendas) {
      if (!v.data_entrega) continue;
      const lista = map.get(v.data_entrega) ?? [];
      lista.push(v);
      map.set(v.data_entrega, lista);
    }
    return map;
  }, [vendas]);

  const proximaEntrega = useMemo(() => {
    const candidatas = vendas
      .filter((v) => v.data_entrega && v.data_entrega >= hojeISO && v.status_entrega === "Pendente")
      .sort((a, b) => (a.data_entrega! < b.data_entrega! ? -1 : 1));
    return candidatas[0] ?? null;
  }, [vendas, hojeISO]);

  const fimSemanaISO = useMemo(() => {
    const hoje = parseISODate(hojeISO);
    return toISODate(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 6));
  }, [hojeISO]);

  const estaSemana = useMemo(() => {
    return vendas
      .filter((v) => v.data_entrega && v.data_entrega >= hojeISO && v.data_entrega <= fimSemanaISO)
      .sort((a, b) => (a.data_entrega! < b.data_entrega! ? -1 : 1));
  }, [vendas, hojeISO, fimSemanaISO]);

  const diasCalendario = useMemo(() => {
    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const dias: { iso: string; dia: number }[] = [];
    for (let dia = 1; dia <= totalDias; dia++) {
      dias.push({ iso: toISODate(new Date(ano, mes, dia)), dia });
    }
    return { primeiroDiaSemana, dias };
  }, [mesAtual]);

  const vendasDoDiaSelecionado = diaSelecionado ? (vendasPorDia.get(diaSelecionado) ?? []) : [];

  function abrirDetalhe(venda: VendaComItens) {
    setVendaDetalhe(venda);
    setNovaData(venda.data_entrega ?? "");
    setConfirmando(false);
    setErro(null);
  }

  function fecharDetalhe() {
    setVendaDetalhe(null);
  }

  function selecionarDia(iso: string) {
    setDiaSelecionado((atual) => (atual === iso ? null : iso));
  }

  function mudarMes(delta: number) {
    setMesAtual((atual) => new Date(atual.getFullYear(), atual.getMonth() + delta, 1));
  }

  async function salvarNovaData() {
    if (!vendaDetalhe || !novaData) return;
    setSalvandoData(true);
    setErro(null);
    const resultado = await atualizarDataEntrega(vendaDetalhe.id, novaData);
    setSalvandoData(false);
    if (resultado.error !== null) {
      setErro(resultado.error);
      return;
    }
    router.refresh();
    setVendaDetalhe({ ...vendaDetalhe, data_entrega: novaData });
  }

  async function confirmarEntrega() {
    if (!vendaDetalhe) return;
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setMarcando(true);
    setErro(null);
    const resultado = await marcarEntregue(vendaDetalhe.id);
    setMarcando(false);
    if (resultado.error !== null) {
      setErro(resultado.error);
      setConfirmando(false);
      return;
    }
    router.refresh();
    fecharDetalhe();
  }

  async function confirmarPagamento() {
    if (!vendaDetalhe) return;
    setConfirmandoPagamento(true);
    setErro(null);
    const resultado = await confirmarRecebimentoRestante(vendaDetalhe.id);
    setConfirmandoPagamento(false);
    if (resultado.error !== null) {
      setErro(resultado.error);
      return;
    }
    router.refresh();
    setVendaDetalhe({
      ...vendaDetalhe,
      sinal: vendaDetalhe.valor_total,
      restante: 0,
      status_pagamento: "Pago",
    });
  }

  return (
    <div>
      <h2 className="mb-3 font-ui text-sm font-extrabold text-texto-suave uppercase tracking-wide">
        Próxima entrega
      </h2>
      <div className="mb-8 rounded-card border border-mel-500/40 bg-mel-100 p-5">
        {proximaEntrega ? (
          <button type="button" className="w-full text-left" onClick={() => abrirDetalhe(proximaEntrega)}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-ui text-[15px] font-bold text-tinta">
                  {proximaEntrega.clientes?.nome ?? "Cliente"}
                </p>
                <p className="truncate font-ui text-[13px] text-texto-medio">
                  {itensResumo(proximaEntrega)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-ui text-[15px] font-bold text-tinta">
                  {formatBRL(proximaEntrega.valor_total)}
                </p>
                <p className="font-ui text-[13px] font-semibold text-cacau-600">
                  {diasRelativos(proximaEntrega.data_entrega!, hojeISO)}
                </p>
              </div>
            </div>
          </button>
        ) : (
          <p className="font-ui text-sm text-texto-medio">Nenhuma entrega agendada.</p>
        )}
      </div>

      <h2 className="mb-3 font-ui text-sm font-extrabold text-texto-suave uppercase tracking-wide">
        Esta semana
      </h2>
      <div className="mb-8 flex flex-col gap-3">
        {estaSemana.length === 0 && (
          <p className="font-ui text-sm text-texto-medio">Nenhuma entrega nos próximos 7 dias.</p>
        )}
        {estaSemana.map((venda) => (
          <LinhaEntrega
            key={venda.id}
            venda={venda}
            badge={diasRelativos(venda.data_entrega!, hojeISO)}
            onClick={() => abrirDetalhe(venda)}
          />
        ))}
      </div>

      <h2 className="mb-3 font-ui text-sm font-extrabold text-texto-suave uppercase tracking-wide">
        Calendário
      </h2>
      <div className="mb-6 rounded-card border border-borda bg-papel p-5">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => mudarMes(-1)}
            aria-label="Mês anterior"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-cacau-600 hover:bg-mel-100"
          >
            ‹
          </button>
          <span className="font-ui text-sm font-extrabold text-tinta">
            {MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
          </span>
          <button
            type="button"
            onClick={() => mudarMes(1)}
            aria-label="Próximo mês"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-cacau-600 hover:bg-mel-100"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {DOWS.map((d, i) => (
            <div key={i} className="font-ui text-[11px] font-bold text-texto-suave">
              {d}
            </div>
          ))}
          {Array.from({ length: diasCalendario.primeiroDiaSemana }).map((_, i) => (
            <div key={`vazio-${i}`} />
          ))}
          {diasCalendario.dias.map(({ iso, dia }) => {
            const temEntrega = (vendasPorDia.get(iso)?.length ?? 0) > 0;
            const ehHoje = iso === hojeISO;
            const selecionado = iso === diaSelecionado;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => selecionarDia(iso)}
                className={`relative flex h-9 w-full items-center justify-center rounded-full font-ui text-sm ${
                  selecionado
                    ? "bg-mel-500 font-extrabold text-tinta"
                    : ehHoje
                      ? "border-2 border-mel-500 font-bold text-tinta"
                      : "text-texto-medio hover:bg-mel-100"
                }`}
              >
                {dia}
                {temEntrega && !selecionado && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-mel-700" />
                )}
              </button>
            );
          })}
        </div>

        {diaSelecionado && (
          <div className="mt-4 border-t border-borda pt-4">
            <p className="mb-2 font-ui text-xs font-bold text-texto-suave">
              {formatDataLonga(diaSelecionado)}
            </p>
            {vendasDoDiaSelecionado.length === 0 ? (
              <p className="font-ui text-sm text-texto-medio">Nenhuma entrega neste dia.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {vendasDoDiaSelecionado.map((venda) => (
                  <LinhaEntrega
                    key={venda.id}
                    venda={venda}
                    badge={venda.status_entrega === "Entregue" ? "Entregue" : undefined}
                    onClick={() => abrirDetalhe(venda)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {vendaDetalhe && (
        <Modal open onClose={fecharDetalhe} widthClass="max-w-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-tinta">Detalhes da entrega</h3>
              <button
                type="button"
                onClick={fecharDetalhe}
                aria-label="Fechar"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-mel-100 font-ui text-sm text-cacau-600 hover:bg-mel-200"
              >
                ✕
              </button>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-ui text-[17px] font-bold text-tinta">
                  {vendaDetalhe.clientes?.nome ?? "Cliente"}
                </p>
                {vendaDetalhe.clientes?.telefone && (
                  <p className="font-ui text-[13px] text-texto-suave">{vendaDetalhe.clientes.telefone}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Tag variant={vendaDetalhe.status_entrega === "Entregue" ? "sucesso" : "categoria"}>
                  {vendaDetalhe.status_entrega}
                </Tag>
                <Tag variant={vendaDetalhe.status_pagamento === "Pago" ? "sucesso" : "destaque"}>
                  {vendaDetalhe.status_pagamento}
                </Tag>
              </div>
            </div>

            <p className="font-ui text-sm text-texto-medio">{itensResumo(vendaDetalhe)}</p>

            <div className="flex flex-col gap-1.5 rounded-bloco border border-borda bg-papel p-3">
              <div className="flex justify-between font-ui text-sm text-texto-medio">
                <span>Sinal recebido</span>
                <span>{formatBRL(vendaDetalhe.sinal)}</span>
              </div>
              <div className="flex justify-between font-ui text-sm text-texto-medio">
                <span>Restante na entrega</span>
                <span>{formatBRL(vendaDetalhe.restante)}</span>
              </div>
              <div className="flex justify-between border-t border-borda pt-1.5 font-ui text-sm font-extrabold text-tinta">
                <span>Valor do pedido</span>
                <span>{formatBRL(vendaDetalhe.valor_total)}</span>
              </div>
            </div>

            {vendaDetalhe.status_pagamento !== "Pago" && (
              <Button variant="outline" className="w-full" disabled={confirmandoPagamento} onClick={confirmarPagamento}>
                {confirmandoPagamento
                  ? "Confirmando..."
                  : `Confirmar recebimento do restante (${formatBRL(vendaDetalhe.restante)})`}
              </Button>
            )}

            <Field label="Data de entrega">
              <Input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
            </Field>

            {erro && <p className="font-ui text-[13px] font-semibold text-erro">{erro}</p>}

            <Button
              variant="outline"
              className="w-full"
              disabled={!novaData || novaData === vendaDetalhe.data_entrega || salvandoData}
              onClick={salvarNovaData}
            >
              {salvandoData ? "Salvando..." : "Salvar nova data"}
            </Button>
            <Button
              className="w-full"
              disabled={vendaDetalhe.status_entrega === "Entregue" || marcando}
              onClick={confirmarEntrega}
            >
              {vendaDetalhe.status_entrega === "Entregue"
                ? "Entrega confirmada ✓"
                : marcando
                  ? "Confirmando..."
                  : confirmando
                    ? "Confirmar entrega?"
                    : "Marcar como entregue"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function LinhaEntrega({
  venda,
  badge,
  onClick,
}: {
  venda: VendaComItens;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-bloco border border-borda bg-papel px-4 py-3 text-left hover:bg-mel-100"
    >
      <div className="min-w-0">
        <p className="font-ui text-[15px] font-bold text-tinta">{venda.clientes?.nome ?? "Cliente"}</p>
        <p className="truncate font-ui text-[13px] text-texto-suave">{itensResumo(venda)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge && (
          <span className="rounded-full bg-mel-200 px-[10px] py-1 font-ui text-[11px] font-bold text-cacau-600">
            {badge}
          </span>
        )}
        <span className="font-ui text-texto-suave">›</span>
      </div>
    </button>
  );
}
