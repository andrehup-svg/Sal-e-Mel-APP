"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { criarVenda, editarVenda } from "./actions";
import { calcularValorItem } from "@/lib/precificacao";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Modal } from "@/components/ui/Modal";
import Comprovante, { type ComprovanteDados } from "./Comprovante";
import type { CategoriaPreco, Cliente, Produto, TipoPrecificacao } from "@/lib/types";

const QTD_PRESETS = [25, 33, 50, 100];

function formatBRLCents(v: number) {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDataBR(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function tipoLabel(tipo: CategoriaPreco["tipo"] | undefined) {
  return tipo === "cento" ? "Cento" : "Unidade";
}

let proximoItemId = 1;

type ItemForm = { itemId: number; produtoId: string; quantidade: number; modo: TipoPrecificacao };

export type VendaParaEditar = {
  id: string;
  cliente_id: string;
  data_entrega: string | null;
  sinal: number;
  itens: { produto_id: string; quantidade: number; modo: TipoPrecificacao }[];
};

function itemFormVazio(): ItemForm {
  return { itemId: proximoItemId++, produtoId: "", quantidade: 25, modo: "cento" };
}

export default function VendaFormModal({
  modo,
  vendaEditando,
  clientes,
  produtos,
  categorias,
  onFechar,
}: {
  modo: "criar" | "editar";
  vendaEditando?: VendaParaEditar | null;
  clientes: Cliente[];
  produtos: Produto[];
  categorias: CategoriaPreco[];
  onFechar: () => void;
}) {
  const router = useRouter();

  const [etapa, setEtapa] = useState<"form" | "sucesso">("form");

  const [buscaCliente, setBuscaCliente] = useState(() => {
    if (modo !== "editar" || !vendaEditando) return "";
    const cliente = clientes.find((c) => c.id === vendaEditando.cliente_id);
    return cliente ? cliente.nome + (cliente.telefone ? ` — ${cliente.telefone}` : "") : "";
  });
  const [clienteId, setClienteId] = useState(() =>
    modo === "editar" && vendaEditando ? vendaEditando.cliente_id : "",
  );
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);

  const [itens, setItens] = useState<ItemForm[]>(() => {
    if (modo === "editar" && vendaEditando) {
      return vendaEditando.itens.map((i) => ({
        itemId: proximoItemId++,
        produtoId: i.produto_id,
        quantidade: i.quantidade,
        modo: i.modo,
      }));
    }
    return [itemFormVazio()];
  });
  const [dataEntrega, setDataEntrega] = useState(() =>
    modo === "editar" && vendaEditando ? (vendaEditando.data_entrega ?? "") : "",
  );
  const [sinal, setSinal] = useState(() => (modo === "editar" && vendaEditando ? vendaEditando.sinal : 0));
  const [sinalManual, setSinalManual] = useState(() => modo === "editar");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [comprovante, setComprovante] = useState<ComprovanteDados | null>(null);

  const categoriaPorProduto = useMemo(() => {
    const map = new Map<string, CategoriaPreco>();
    for (const p of produtos) {
      const cat = categorias.find((c) => c.id === p.categoria_id);
      if (cat) map.set(p.id, cat);
    }
    return map;
  }, [produtos, categorias]);

  function valorDoItem(item: ItemForm) {
    const cat = categoriaPorProduto.get(item.produtoId);
    if (!cat) return 0;
    const itemModo: TipoPrecificacao = cat.tipo === "unidade" ? "unidade" : item.modo;
    return calcularValorItem(cat, item.quantidade, itemModo);
  }

  const subtotal = itens.reduce((acc, item) => acc + valorDoItem(item), 0);
  const sinalEfetivo = sinalManual ? sinal : Math.round(subtotal * 0.5 * 100) / 100;
  const restante = subtotal - sinalEfetivo;
  const podeSalvar = subtotal > 0 && !!clienteId && !salvando;

  const sugestoes = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();
    const termoDigitos = termo.replace(/\D/g, "");
    return clientes.filter((c) => {
      const nomeBate = c.nome.toLowerCase().includes(termo);
      const foneBate = termoDigitos && (c.telefone ?? "").replace(/\D/g, "").includes(termoDigitos);
      return nomeBate || foneBate;
    });
  }, [clientes, buscaCliente]);

  function fechar() {
    onFechar();
  }

  function adicionarItem() {
    setItens((prev) => [...prev, itemFormVazio()]);
  }

  function removerItem(itemId: number) {
    setItens((prev) => prev.filter((i) => i.itemId !== itemId));
  }

  function atualizarItem(itemId: number, patch: Partial<ItemForm>) {
    setItens((prev) => prev.map((i) => (i.itemId === itemId ? { ...i, ...patch } : i)));
  }

  function selecionarCliente(cliente: Cliente) {
    setClienteId(cliente.id);
    setBuscaCliente(cliente.nome + (cliente.telefone ? ` — ${cliente.telefone}` : ""));
    setSugestoesAbertas(false);
  }

  async function salvar() {
    if (!podeSalvar) return;
    setSalvando(true);
    setErro(null);

    const cliente = clientes.find((c) => c.id === clienteId)!;
    const itensDetalhe = itens
      .filter((i) => i.produtoId)
      .map((i) => {
        const produto = produtos.find((p) => p.id === i.produtoId);
        return { texto: `${i.quantidade} ${produto?.nome.toLowerCase() ?? "item"}`, valor: valorDoItem(i) };
      });

    const payload = {
      cliente_id: clienteId,
      data_entrega: dataEntrega || null,
      sinal: sinalEfetivo,
      itens: itens.map((i) => ({ produto_id: i.produtoId, quantidade: i.quantidade, modo: i.modo })),
    };

    const resultado =
      modo === "editar" && vendaEditando
        ? await editarVenda(vendaEditando.id, payload)
        : await criarVenda(payload);

    setSalvando(false);

    if (resultado.error !== null) {
      setErro(resultado.error);
      return;
    }

    router.refresh();

    if (modo === "editar") {
      fechar();
      return;
    }

    setComprovante({
      cliente: cliente.nome,
      telefone: cliente.telefone,
      itens: itensDetalhe,
      total: resultado.venda.valor_total,
      sinal: resultado.venda.sinal,
      restante: resultado.venda.restante,
      dataEntregaBR: formatDataBR(dataEntrega),
    });
    setEtapa("sucesso");
  }

  async function baixarComprovante() {
    const el = document.getElementById("comprovante-imagem");
    if (!el) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = "pedido-sal-e-mel.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function compartilharComprovante() {
    const el = document.getElementById("comprovante-imagem");
    if (!el) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "pedido-sal-e-mel.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
        share?: (data: { files: File[]; title: string }) => Promise<void>;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        nav.share({ files: [file], title: "Pedido Sal e Mel" }).catch(() => {});
      } else {
        const link = document.createElement("a");
        link.download = "pedido-sal-e-mel.png";
        link.href = URL.createObjectURL(blob);
        link.click();
      }
    });
  }

  const titulo = modo === "editar" ? "Editar venda" : "Nova venda";

  return (
    <Modal open onClose={fechar} widthClass="max-w-lg" closeOnBackdropClick={false}>
      {etapa === "form" ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-tinta">{titulo}</h3>
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-mel-100 font-ui text-sm text-cacau-600 hover:bg-mel-200"
            >
              ✕
            </button>
          </div>

          <div className="relative">
            <Field label="Cliente">
              <Input
                value={buscaCliente}
                placeholder="Buscar por nome ou telefone"
                autoComplete="off"
                onFocus={() => setSugestoesAbertas(true)}
                onChange={(e) => {
                  setBuscaCliente(e.target.value);
                  setClienteId("");
                  setSugestoesAbertas(true);
                }}
                onBlur={() => setTimeout(() => setSugestoesAbertas(false), 150)}
              />
            </Field>
            {sugestoesAbertas && (
              <div className="absolute top-full right-0 left-0 z-10 mt-1 max-h-44 overflow-y-auto rounded-input border border-borda bg-white shadow-lg">
                {sugestoes.length === 0 ? (
                  <div className="px-3 py-2 font-ui text-sm text-texto-suave">
                    Nenhum cliente encontrado
                  </div>
                ) : (
                  sugestoes.map((c) => (
                    <div
                      key={c.id}
                      className="flex cursor-pointer justify-between gap-2 px-3 py-2 font-ui text-sm hover:bg-mel-100"
                      onMouseDown={() => selecionarCliente(c)}
                    >
                      <span className="font-bold">{c.nome}</span>
                      <span className="text-texto-suave">{c.telefone}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <Link
            href="/clientes"
            className="-mt-2 font-ui text-xs text-texto-suave underline"
            onClick={fechar}
          >
            Gerenciar clientes
          </Link>

          <div className="flex flex-col gap-3">
            <span className="font-ui text-sm font-extrabold text-tinta">Itens do pedido</span>
            {itens.map((item) => (
              <ItemRow
                key={item.itemId}
                item={item}
                produtos={produtos}
                categoriaPorProduto={categoriaPorProduto}
                valor={valorDoItem(item)}
                onMudarProduto={(produtoId) => {
                  const cat = categoriaPorProduto.get(produtoId);
                  atualizarItem(item.itemId, {
                    produtoId,
                    modo: cat && cat.tipo === "unidade" ? "unidade" : "cento",
                  });
                }}
                onMudarQuantidade={(quantidade) => atualizarItem(item.itemId, { quantidade })}
                onMudarModo={(itemModo) => atualizarItem(item.itemId, { modo: itemModo })}
                onRemover={() => removerItem(item.itemId)}
              />
            ))}
            <button
              type="button"
              onClick={adicionarItem}
              className="self-start font-ui text-sm font-bold text-mel-700 hover:underline"
            >
              + Adicionar item
            </button>
            <Link href="/produtos" className="font-ui text-xs text-texto-suave underline" onClick={fechar}>
              Gerenciar produtos
            </Link>
          </div>

          <div className="flex justify-between border-t border-borda pt-3 font-ui text-base font-extrabold text-tinta">
            <span>Valor do pedido</span>
            <span>{formatBRLCents(subtotal)}</span>
          </div>

          <Field label="Data de entrega">
            <Input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
          </Field>

          <Field label="Sinal (recebido agora)">
            <MoneyInput
              value={sinalEfetivo}
              onChange={(reais) => {
                setSinal(reais);
                setSinalManual(true);
              }}
            />
          </Field>

          <div className="flex justify-between font-ui text-sm text-texto-medio">
            <span>Restante na entrega</span>
            <span className="font-bold text-tinta">{formatBRLCents(restante)}</span>
          </div>

          {erro && <p className="font-ui text-[13px] font-semibold text-erro">{erro}</p>}

          <Button onClick={salvar} disabled={!podeSalvar} className="w-full">
            {salvando ? "Salvando..." : modo === "editar" ? "Salvar alterações" : "Salvar venda"}
          </Button>
        </div>
      ) : (
        comprovante && (
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-xl text-tinta">Venda registrada!</h3>
            <div id="comprovante-imagem">
              <Comprovante dados={comprovante} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={baixarComprovante}>
                Baixar imagem
              </Button>
              <Button className="flex-1" onClick={compartilharComprovante}>
                Compartilhar
              </Button>
            </div>
            <Button variant="ghost" onClick={fechar}>
              Fechar
            </Button>
          </div>
        )
      )}
    </Modal>
  );
}

function labelProduto(produto: Produto | undefined, categoriaPorProduto: Map<string, CategoriaPreco>) {
  if (!produto) return "";
  const cat = categoriaPorProduto.get(produto.id);
  return `${produto.nome} — ${cat?.nome ?? ""} (${tipoLabel(cat?.tipo)})`;
}

function ItemRow({
  item,
  produtos,
  categoriaPorProduto,
  valor,
  onMudarProduto,
  onMudarQuantidade,
  onMudarModo,
  onRemover,
}: {
  item: ItemForm;
  produtos: Produto[];
  categoriaPorProduto: Map<string, CategoriaPreco>;
  valor: number;
  onMudarProduto: (produtoId: string) => void;
  onMudarQuantidade: (quantidade: number) => void;
  onMudarModo: (modo: TipoPrecificacao) => void;
  onRemover: () => void;
}) {
  const categoriaAtual = categoriaPorProduto.get(item.produtoId);
  const permiteEscolherModo = categoriaAtual?.tipo === "cento";
  const [busca, setBusca] = useState(() =>
    labelProduto(
      produtos.find((p) => p.id === item.produtoId),
      categoriaPorProduto,
    ),
  );
  const ultimoSelecionadoRef = useRef<{ id: string; label: string } | null>(
    (() => {
      const produto = produtos.find((p) => p.id === item.produtoId);
      return produto ? { id: produto.id, label: labelProduto(produto, categoriaPorProduto) } : null;
    })(),
  );
  const produtoIdRef = useRef(item.produtoId);
  useEffect(() => {
    produtoIdRef.current = item.produtoId;
  }, [item.produtoId]);

  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
  const [qtdTexto, setQtdTexto] = useState(() => String(item.quantidade));
  const [ultimaQuantidade, setUltimaQuantidade] = useState(item.quantidade);

  if (item.quantidade !== ultimaQuantidade) {
    setUltimaQuantidade(item.quantidade);
    setQtdTexto(String(item.quantidade));
  }

  const sugestoes = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter((p) => p.nome.toLowerCase().includes(termo));
  }, [produtos, busca]);

  function selecionarProduto(produto: Produto) {
    const label = labelProduto(produto, categoriaPorProduto);
    onMudarProduto(produto.id);
    setBusca(label);
    ultimoSelecionadoRef.current = { id: produto.id, label };
    setSugestoesAbertas(false);
  }

  return (
    <div className="flex flex-col gap-2 rounded-bloco border border-borda bg-papel p-3">
      <div className="relative">
        <input
          value={busca}
          placeholder="Digite o nome do produto"
          autoComplete="off"
          onFocus={() => {
            setSugestoesAbertas(true);
            if (ultimoSelecionadoRef.current) setBusca("");
          }}
          onChange={(e) => {
            setBusca(e.target.value);
            onMudarProduto("");
            setSugestoesAbertas(true);
          }}
          onBlur={() =>
            setTimeout(() => {
              setSugestoesAbertas(false);
              if (!produtoIdRef.current) {
                if (ultimoSelecionadoRef.current) {
                  onMudarProduto(ultimoSelecionadoRef.current.id);
                  setBusca(ultimoSelecionadoRef.current.label);
                } else {
                  setBusca("");
                }
              }
            }, 150)
          }
          className="w-full rounded-input border-2 border-borda bg-white px-3 py-2.5 font-ui text-sm text-tinta outline-none focus:border-mel-500"
        />
        {sugestoesAbertas && (
          <div className="absolute top-full right-0 left-0 z-10 mt-1 max-h-44 overflow-y-auto rounded-input border border-borda bg-white shadow-lg">
            {sugestoes.length === 0 ? (
              <div className="px-3 py-2 font-ui text-sm text-texto-suave">Nenhum produto encontrado</div>
            ) : (
              sugestoes.map((p) => {
                const cat = categoriaPorProduto.get(p.id);
                return (
                  <div
                    key={p.id}
                    className="flex cursor-pointer justify-between gap-2 px-3 py-2 font-ui text-sm hover:bg-mel-100"
                    onMouseDown={() => selecionarProduto(p)}
                  >
                    <span className="font-bold">{p.nome}</span>
                    <span className="text-texto-suave">
                      {cat?.nome ?? ""} ({tipoLabel(cat?.tipo)})
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex shrink-0 items-center gap-1 rounded-input border-2 border-borda bg-white py-2 pr-3 pl-3 focus-within:border-mel-500">
          <input
            type="text"
            inputMode="numeric"
            value={qtdTexto}
            onChange={(e) => {
              const digitos = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
              setQtdTexto(digitos);
              if (digitos !== "") onMudarQuantidade(parseInt(digitos, 10));
            }}
            onBlur={() => {
              if (qtdTexto === "") setQtdTexto(String(item.quantidade));
            }}
            className="w-10 bg-transparent text-center font-ui text-sm text-tinta outline-none"
          />
          <span className="font-ui text-xs text-texto-suave">und</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-ui text-xs text-texto-suave">Qtd. rápida:</span>
          {QTD_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onMudarQuantidade(preset)}
              className={`rounded-full border px-[10px] py-1 font-ui text-xs font-bold ${
                item.quantidade === preset
                  ? "border-mel-500 bg-mel-500 text-tinta"
                  : "border-borda bg-white text-texto-medio"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
      {permiteEscolherModo && (
        <div className="flex items-center gap-1.5">
          <span className="font-ui text-xs text-texto-suave">Vender por:</span>
          {(["cento", "unidade"] as const).map((modoOpcao) => (
            <button
              key={modoOpcao}
              type="button"
              onClick={() => onMudarModo(modoOpcao)}
              className={`rounded-full border px-[10px] py-1 font-ui text-xs font-bold ${
                item.modo === modoOpcao
                  ? "border-mel-500 bg-mel-500 text-tinta"
                  : "border-borda bg-white text-texto-medio"
              }`}
            >
              {modoOpcao === "cento" ? "Cento (pro-rata)" : "Unidade avulsa"}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onRemover}
          className="flex items-center gap-1.5 font-ui text-xs text-texto-suave hover:text-cacau-600"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-mel-100 text-cacau-600">
            ✕
          </span>
          Remover item
        </button>
        <span className="font-ui text-sm font-bold text-tinta">{formatBRLCents(valor)}</span>
      </div>
    </div>
  );
}
