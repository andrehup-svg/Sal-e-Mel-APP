function formatBRLCents(v: number) {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type ComprovanteDados = {
  cliente: string;
  telefone: string | null;
  itens: { texto: string; valor: number }[];
  total: number;
  sinal: number;
  restante: number;
  dataEntregaBR: string;
};

export default function Comprovante({ dados }: { dados: ComprovanteDados }) {
  return (
    <div className="rounded-card border border-borda bg-papel p-6">
      <div className="font-display text-xl text-tinta">Sal e Mel</div>
      <div className="mt-1 mb-4 font-ui text-xs font-bold uppercase tracking-wide text-texto-suave">
        Pedido confirmado
      </div>

      <div className="mb-4 rounded-bloco bg-mel-100 px-4 py-3">
        <div className="font-ui text-xs font-bold uppercase tracking-wide text-mel-700">
          Total do pedido
        </div>
        <div className="font-display text-[26px] text-tinta">{formatBRLCents(dados.total)}</div>
      </div>

      <div className="font-ui text-[15px] font-bold text-tinta">{dados.cliente}</div>
      {dados.telefone && (
        <div className="mb-1 font-ui text-xs text-texto-suave">{dados.telefone}</div>
      )}

      <hr className="my-3 border-borda" />

      {dados.itens.map((item, i) => (
        <div key={i} className="flex justify-between py-1 font-ui text-[13px] text-texto-medio">
          <span>{item.texto}</span>
          <span>{formatBRLCents(item.valor)}</span>
        </div>
      ))}

      <hr className="my-3 border-borda" />

      <div className="flex justify-between py-1 font-ui text-[13px] text-texto-medio">
        <span>Sinal recebido</span>
        <span>{formatBRLCents(dados.sinal)}</span>
      </div>
      <div className="flex justify-between py-1 font-ui text-[13px] text-texto-medio">
        <span>Restante na entrega</span>
        <span>{formatBRLCents(dados.restante)}</span>
      </div>
      <div className="flex justify-between py-1 font-ui text-[13px] text-texto-medio">
        <span>Data de entrega</span>
        <span>{dados.dataEntregaBR}</span>
      </div>

      <div className="mt-4 text-center font-ui text-xs text-texto-suave">
        Obrigada pela preferência!
      </div>
    </div>
  );
}
