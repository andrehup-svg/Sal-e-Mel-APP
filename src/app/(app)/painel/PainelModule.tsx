import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { VendaComItens } from "../vendas/types";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDataCurta(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const data = new Date(y, m - 1, d);
  const texto = data.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
  return texto.charAt(0).toUpperCase() + texto.slice(1).replace(".", "");
}

function itensResumo(venda: VendaComItens) {
  if (venda.venda_itens.length === 0) return "Sem itens";
  return venda.venda_itens
    .map((i) => `${i.quantidade} ${i.produtos?.nome.toLowerCase() ?? "item"}`)
    .join(" + ");
}

export default function PainelModule({
  mesLabel,
  lucroMes,
  parteDono,
  parteSocia,
  vendasMes,
  comprasMes,
  proximasEntregas,
}: {
  mesLabel: string;
  lucroMes: number;
  parteDono: number;
  parteSocia: number;
  vendasMes: number;
  comprasMes: number;
  proximasEntregas: VendaComItens[];
}) {
  return (
    <div>
      <div className="mb-8">
        <p className="font-ui text-xs font-bold uppercase tracking-wide text-texto-suave">{mesLabel}</p>
        <h1 className="font-display text-[32px] text-tinta">Painel</h1>
      </div>

      <div className="mb-6 rounded-card border border-mel-500/40 bg-mel-100 p-5">
        <div className="font-ui text-xs font-bold uppercase tracking-wide text-cacau-600">
          Lucro do mês
        </div>
        <div className="font-display text-3xl text-tinta">{formatBRL(lucroMes)}</div>
        <div className="font-ui text-sm text-texto-medio">
          Sua parte {formatBRL(parteDono)} · Sócia {formatBRL(parteSocia)}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card>
          <div className="font-ui text-xs font-bold uppercase tracking-wide text-texto-suave">
            Vendas do mês
          </div>
          <div className="font-display text-2xl text-tinta">{formatBRL(vendasMes)}</div>
        </Card>
        <Card>
          <div className="font-ui text-xs font-bold uppercase tracking-wide text-texto-suave">
            Compras do mês
          </div>
          <div className="font-display text-2xl text-tinta">{formatBRL(comprasMes)}</div>
        </Card>
      </div>

      <h2 className="mb-3 font-ui text-sm font-extrabold text-texto-suave uppercase tracking-wide">
        Próximas entregas
      </h2>
      <div className="mb-8 flex flex-col gap-3">
        {proximasEntregas.length === 0 && (
          <p className="font-ui text-sm text-texto-medio">Nenhuma entrega agendada.</p>
        )}
        {proximasEntregas.map((venda) => (
          <div key={venda.id} className="rounded-bloco border border-borda bg-papel px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-ui text-[15px] font-bold text-tinta">
                  {venda.clientes?.nome ?? "Cliente"}
                </p>
                <p className="truncate font-ui text-[13px] text-texto-suave">{itensResumo(venda)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-ui text-[15px] font-bold text-tinta">
                  {formatBRL(venda.valor_total)}
                </p>
                {venda.data_entrega && (
                  <p className="font-ui text-[13px] font-semibold text-texto-suave">
                    {formatDataCurta(venda.data_entrega)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <ShortcutCard href="/produtos" label="Gerenciar produtos" letra="P" />
        <ShortcutCard href="/clientes" label="Gerenciar clientes" letra="C" />
      </div>
    </div>
  );
}

function ShortcutCard({ href, label, letra }: { href: string; label: string; letra: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-bloco border border-borda bg-papel px-4 py-3 hover:bg-mel-100"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mel-500 font-ui text-sm font-extrabold text-tinta">
        {letra}
      </span>
      <span className="flex-1 font-ui text-sm font-bold text-tinta">{label}</span>
      <span className="font-ui text-texto-suave">›</span>
    </Link>
  );
}
