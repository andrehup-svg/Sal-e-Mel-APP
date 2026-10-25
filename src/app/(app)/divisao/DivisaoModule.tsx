"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import type { StatusDono, StatusSocia } from "@/lib/types";
import { alterarPercentualSocia, marcarRepassado, marcarRetirado } from "./actions";

export type MesDivisao = {
  mes: string;
  label: string;
  vendas: number;
  compras: number;
  lucro: number;
  percentualSocia: number;
  parteSocia: number;
  parteDono: number;
  statusDono: StatusDono;
  dataRetirada: string | null;
  statusSocia: StatusSocia;
  dataRepasse: string | null;
};

export type VendaDetalhe = {
  id: string;
  cliente: string;
  itens: string;
  valor: number;
  pago: boolean;
  restante: number;
};

export type CompraDetalhe = {
  id: string;
  fornecedor: string;
  item: string | null;
  valor: number;
  pago: boolean;
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercentual(p: number) {
  return `${p.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

// "2026-10-04" -> "4 de out"
function formatDataCurta(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d)
    .toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
    .replace(".", "");
}

function textoExtrato(m: MesDivisao) {
  return [
    "Sal e Mel — Divisão de Lucros",
    m.label,
    "",
    `Vendas: ${formatBRL(m.vendas)}`,
    `Compras: – ${formatBRL(m.compras)}`,
    `Lucro: ${formatBRL(m.lucro)}`,
    "",
    `Parte do André (${formatPercentual(100 - m.percentualSocia)}): ${formatBRL(m.parteDono)}`,
    `Parte da sócia (${formatPercentual(m.percentualSocia)}): ${formatBRL(m.parteSocia)}`,
  ].join("\n");
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-ui text-xs font-bold uppercase tracking-wide text-texto-suave">{children}</div>
  );
}

function CabecalhoModal({ titulo, onClose }: { titulo: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="font-display text-xl text-tinta">{titulo}</h3>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-mel-100 font-ui text-sm text-cacau-600 hover:bg-mel-200"
      >
        ✕
      </button>
    </div>
  );
}

function ParteCard({
  titulo,
  valor,
  feito,
  textoPendente,
  textoFeito,
  dataFeito,
  rotuloAcao,
  destaque,
  ocupado,
  onMarcar,
}: {
  titulo: string;
  valor: number;
  feito: boolean;
  textoPendente: string;
  textoFeito: string;
  dataFeito: string | null;
  rotuloAcao: string;
  destaque: boolean;
  ocupado: boolean;
  onMarcar: (feito: boolean) => void;
}) {
  return (
    <div
      className={`flex flex-col rounded-card border p-5 ${
        destaque ? "border-mel-500/40 bg-mel-100" : "border-borda bg-papel"
      }`}
    >
      <Eyebrow>{titulo}</Eyebrow>
      <div className="font-display text-3xl text-tinta">{formatBRL(valor)}</div>
      <div className={`font-ui text-sm ${feito ? "font-bold text-sucesso" : "text-texto-medio"}`}>
        {feito ? `${textoFeito}${dataFeito ? ` em ${formatDataCurta(dataFeito)}` : ""}` : textoPendente}
      </div>
      {feito ? (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => onMarcar(false)}
          className="mt-3 self-start font-ui text-xs font-bold text-texto-suave underline hover:text-cacau-600 disabled:opacity-50"
        >
          Desfazer
        </button>
      ) : (
        <Button className="mt-4 w-full" disabled={ocupado} onClick={() => onMarcar(true)}>
          {rotuloAcao}
        </Button>
      )}
    </div>
  );
}

export default function DivisaoModule({
  atual,
  ehMesAtual,
  percentualVigente,
  vendasDetalhe,
  comprasDetalhe,
  historico,
}: {
  atual: MesDivisao;
  ehMesAtual: boolean;
  percentualVigente: number;
  vendasDetalhe: VendaDetalhe[];
  comprasDetalhe: CompraDetalhe[];
  historico: MesDivisao[];
}) {
  const [modal, setModal] = useState<null | "vendas" | "compras" | "extrato" | "percentual">(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const [percentualTexto, setPercentualTexto] = useState("");
  const [erroPercentual, setErroPercentual] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const fechar = () => setModal(null);
  const mesSlug = atual.mes.slice(0, 7);
  const percentualCongelado = atual.percentualSocia !== percentualVigente;

  function executar(acao: () => Promise<{ error: string | null }>) {
    setErro(null);
    startTransition(async () => {
      const { error } = await acao();
      if (error) setErro(error);
    });
  }

  function abrirPercentual() {
    setPercentualTexto(String(percentualVigente).replace(".", ","));
    setErroPercentual(null);
    setModal("percentual");
  }

  function salvarPercentual() {
    const valor = Number(percentualTexto.replace(",", "."));
    if (percentualTexto.trim() === "" || !Number.isFinite(valor) || valor < 0 || valor > 100) {
      setErroPercentual("Informe um número entre 0 e 100.");
      return;
    }
    startTransition(async () => {
      const { error } = await alterarPercentualSocia(valor);
      if (error) setErroPercentual(error);
      else setModal(null);
    });
  }

  async function gerarImagem() {
    const el = document.getElementById("extrato-imagem");
    if (!el) return null;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#fffbf4" });
    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  }

  async function compartilharImagem() {
    const blob = await gerarImagem();
    if (!blob) return;
    const nomeArquivo = `divisao-${mesSlug}.png`;
    const file = new File([blob], nomeArquivo, { type: "image/png" });
    const nav = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
      share?: (data: { files: File[]; title: string }) => Promise<void>;
    };
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      nav.share({ files: [file], title: `Divisão de lucros · ${atual.label}` }).catch(() => {});
    } else {
      const link = document.createElement("a");
      link.download = nomeArquivo;
      link.href = URL.createObjectURL(blob);
      link.click();
    }
  }

  function copiarTexto() {
    navigator.clipboard?.writeText(textoExtrato(atual)).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  function enviarWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(textoExtrato(atual))}`, "_blank");
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-ui text-xs font-bold uppercase tracking-wide text-texto-suave">{atual.label}</p>
          <h1 className="font-display text-[32px] text-tinta">Divisão de Lucros</h1>
          {!ehMesAtual && (
            <Link href="/divisao" className="font-ui text-xs font-bold text-mel-700 underline">
              ← Voltar para o mês atual
            </Link>
          )}
        </div>
        <Button size="sm" onClick={() => setModal("extrato")}>
          Compartilhar extrato
        </Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <button type="button" onClick={() => setModal("vendas")} className="text-left">
          <Card className="h-full hover:border-mel-500">
            <Eyebrow>Vendas do mês ›</Eyebrow>
            <div className="font-display text-2xl text-tinta">{formatBRL(atual.vendas)}</div>
          </Card>
        </button>
        <button type="button" onClick={() => setModal("compras")} className="text-left">
          <Card className="h-full hover:border-mel-500">
            <Eyebrow>Compras do mês ›</Eyebrow>
            <div className="font-display text-2xl text-tinta">– {formatBRL(atual.compras)}</div>
          </Card>
        </button>
        <Card className="border-tinta">
          <Eyebrow>{atual.lucro < 0 ? "Prejuízo do mês" : "Lucro do mês"}</Eyebrow>
          <div className={`font-display text-2xl ${atual.lucro < 0 ? "text-erro" : "text-tinta"}`}>
            {formatBRL(atual.lucro)}
          </div>
        </Card>
      </div>

      <div className="mb-3 grid gap-4 sm:grid-cols-2">
        <ParteCard
          titulo={`Sua parte · ${formatPercentual(100 - atual.percentualSocia)}`}
          valor={atual.parteDono}
          feito={atual.statusDono === "Retirado"}
          textoPendente="Ainda no caixa do negócio"
          textoFeito="Retirado"
          dataFeito={atual.dataRetirada}
          rotuloAcao="Marcar como retirado"
          destaque
          ocupado={pendente}
          onMarcar={(feito) => executar(() => marcarRetirado(atual.mes, feito))}
        />
        <ParteCard
          titulo={`Parte da sócia · ${formatPercentual(atual.percentualSocia)}`}
          valor={atual.parteSocia}
          feito={atual.statusSocia === "Repassado"}
          textoPendente="Pendente de repasse"
          textoFeito="Repassado"
          dataFeito={atual.dataRepasse}
          rotuloAcao="Marcar como repassado"
          destaque={false}
          ocupado={pendente}
          onMarcar={(feito) => executar(() => marcarRepassado(atual.mes, feito))}
        />
      </div>
      {erro && <p className="mb-3 font-ui text-[13px] font-semibold text-erro">{erro}</p>}

      <p className="mb-10 font-ui text-sm text-texto-medio">
        Percentual da sócia: <strong>{formatPercentual(percentualVigente)}</strong>
        {percentualCongelado && ` (este mês ficou com ${formatPercentual(atual.percentualSocia)})`} ·{" "}
        <button type="button" onClick={abrirPercentual} className="font-bold text-mel-700 underline">
          Alterar
        </button>
      </p>

      <h2 className="mb-3 font-ui text-sm font-extrabold uppercase tracking-wide text-texto-suave">Histórico</h2>
      {historico.length === 0 ? (
        <p className="font-ui text-sm text-texto-medio">Nenhum mês anterior ainda.</p>
      ) : (
        <div className="flex flex-col divide-y divide-borda overflow-hidden rounded-card border border-borda bg-papel">
          {historico.map((m) => (
            <Link
              key={m.mes}
              href={`/divisao?mes=${m.mes.slice(0, 7)}`}
              className={`flex items-start justify-between gap-4 px-5 py-4 no-underline hover:bg-mel-100 ${
                m.mes === atual.mes ? "bg-mel-100" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="font-ui text-[15px] font-extrabold text-tinta">{m.label}</div>
                <div className="font-ui text-sm text-texto-medio">
                  Sua parte {formatBRL(m.parteDono)}:{" "}
                  {m.statusDono === "Retirado"
                    ? `retirado${m.dataRetirada ? ` em ${formatDataCurta(m.dataRetirada)}` : ""}`
                    : "ainda no caixa"}
                </div>
                <div className="font-ui text-sm text-texto-medio">
                  Sócia {formatBRL(m.parteSocia)}:{" "}
                  {m.statusSocia === "Repassado"
                    ? `repassado${m.dataRepasse ? ` em ${formatDataCurta(m.dataRepasse)}` : ""}`
                    : "pendente de repasse"}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className={`font-display text-lg ${m.lucro < 0 ? "text-erro" : "text-tinta"}`}>
                  {formatBRL(m.lucro)}
                </div>
                <div className="font-ui text-xs text-texto-suave">{m.lucro < 0 ? "prejuízo" : "lucro"}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={modal === "vendas"} onClose={fechar} widthClass="max-w-lg">
        <CabecalhoModal titulo={`Vendas · ${atual.label}`} onClose={fechar} />
        {vendasDetalhe.length === 0 ? (
          <p className="font-ui text-sm text-texto-medio">Nenhuma venda neste mês.</p>
        ) : (
          <div className="flex flex-col divide-y divide-borda">
            {vendasDetalhe.map((v) => (
              <div key={v.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="font-ui text-[15px] font-extrabold text-tinta">{v.cliente}</div>
                  <div className="font-ui text-sm text-texto-medio">{v.itens}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-ui text-[15px] font-bold text-tinta">{formatBRL(v.valor)}</div>
                  <div className={`font-ui text-xs font-bold ${v.pago ? "text-sucesso" : "text-texto-suave"}`}>
                    {v.pago ? "Pago" : `Falta ${formatBRL(v.restante)}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex justify-between border-t-2 border-tinta pt-3 font-ui text-[15px] font-extrabold text-tinta">
          <span>Total</span>
          <span>{formatBRL(atual.vendas)}</span>
        </div>
      </Modal>

      <Modal open={modal === "compras"} onClose={fechar} widthClass="max-w-lg">
        <CabecalhoModal titulo={`Compras · ${atual.label}`} onClose={fechar} />
        {comprasDetalhe.length === 0 ? (
          <p className="font-ui text-sm text-texto-medio">Nenhuma compra neste mês.</p>
        ) : (
          <div className="flex flex-col divide-y divide-borda">
            {comprasDetalhe.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="font-ui text-[15px] font-extrabold text-tinta">{c.fornecedor}</div>
                  {c.item && <div className="font-ui text-sm text-texto-medio">{c.item}</div>}
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-ui text-[15px] font-bold text-tinta">{formatBRL(c.valor)}</div>
                  <div className={`font-ui text-xs font-bold ${c.pago ? "text-sucesso" : "text-texto-suave"}`}>
                    {c.pago ? "Pago" : "Na fatura"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex justify-between border-t-2 border-tinta pt-3 font-ui text-[15px] font-extrabold text-tinta">
          <span>Total</span>
          <span>{formatBRL(atual.compras)}</span>
        </div>
      </Modal>

      <Modal open={modal === "extrato"} onClose={fechar}>
        <CabecalhoModal titulo="Compartilhar extrato" onClose={fechar} />
        <div id="extrato-imagem" className="rounded-bloco border border-borda bg-papel p-5">
          <div className="font-ui text-xs font-bold uppercase tracking-wide text-cacau-600">
            Sal e Mel · Divisão de lucros
          </div>
          <div className="mb-3 font-display text-xl text-tinta">{atual.label}</div>
          <div className="flex flex-col gap-1.5 font-ui text-sm text-tinta">
            <div className="flex justify-between">
              <span>Vendas</span>
              <span>{formatBRL(atual.vendas)}</span>
            </div>
            <div className="flex justify-between">
              <span>Compras</span>
              <span>– {formatBRL(atual.compras)}</span>
            </div>
            <div className="flex justify-between border-t border-borda pt-1.5 font-extrabold">
              <span>{atual.lucro < 0 ? "Prejuízo" : "Lucro"}</span>
              <span>{formatBRL(atual.lucro)}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span>Parte do André · {formatPercentual(100 - atual.percentualSocia)}</span>
              <span>{formatBRL(atual.parteDono)}</span>
            </div>
            <div className="flex justify-between">
              <span>Parte da sócia · {formatPercentual(atual.percentualSocia)}</span>
              <span>{formatBRL(atual.parteSocia)}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={compartilharImagem}>Compartilhar imagem</Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={copiarTexto}>
              {copiado ? "Copiado ✓" : "Copiar texto"}
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={enviarWhatsApp}>
              WhatsApp
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "percentual"} onClose={fechar}>
        <CabecalhoModal titulo="Percentual da sócia" onClose={fechar} />
        <p className="mb-4 font-ui text-sm text-texto-medio">
          Vale a partir deste mês. Os meses anteriores continuam com o percentual que tinham, e meses já
          marcados como retirado ou repassado não mudam.
        </p>
        <label className="flex items-center gap-2 font-ui text-sm font-bold text-tinta">
          <input
            inputMode="decimal"
            value={percentualTexto}
            onChange={(e) => setPercentualTexto(e.target.value)}
            className="h-12 w-28 rounded-input border border-borda bg-papel px-4 font-ui text-base text-tinta"
          />
          %
        </label>
        {erroPercentual && <p className="mt-2 font-ui text-[13px] font-semibold text-erro">{erroPercentual}</p>}
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={fechar}>
            Cancelar
          </Button>
          <Button className="flex-1" disabled={pendente} onClick={salvarPercentual}>
            Salvar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
