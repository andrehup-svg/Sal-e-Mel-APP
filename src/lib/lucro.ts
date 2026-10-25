// Regras da seção 6 do regras-de-negocio.md, num lugar só, pra que o
// Painel e a Divisão de Lucros sempre mostrem o mesmo número.

const FUSO = "America/Sao_Paulo";

// "YYYY-MM-DD" de hoje no horário de Brasília (o servidor roda em UTC).
export function hojeISOBrasil() {
  return new Date().toLocaleDateString("en-CA", { timeZone: FUSO });
}

// Mês de referência sempre como dia 1: "2026-10-01".
export function mesReferencia(dataISO: string) {
  return `${dataISO.slice(0, 7)}-01`;
}

// Uma venda conta no mês em que foi cadastrada (created_at), no
// horário de Brasília — uma venda das 22h do dia 31 não vaza pro mês seguinte.
export function mesDaVenda(createdAt: string) {
  return mesReferencia(new Date(createdAt).toLocaleDateString("en-CA", { timeZone: FUSO }));
}

// Uma compra conta no mês da data da compra, seja Pix ou cartão
// (paga ou ainda na fatura). Sem data, não entra em mês nenhum.
export function mesDaCompra(dataCompra: string | null) {
  return dataCompra ? mesReferencia(dataCompra) : null;
}

export function somaVendasDoMes<T extends { valor_total: number; created_at: string }>(
  vendas: T[],
  mes: string,
) {
  const doMes = vendas.filter((v) => mesDaVenda(v.created_at) === mes);
  return { lista: doMes, total: doMes.reduce((acc, v) => acc + v.valor_total, 0) };
}

export function somaComprasDoMes<T extends { valor: number; data_compra: string | null }>(
  compras: T[],
  mes: string,
) {
  const doMes = compras.filter((c) => mesDaCompra(c.data_compra) === mes);
  return { lista: doMes, total: doMes.reduce((acc, c) => acc + c.valor, 0) };
}

// Mês com percentual congelado usa o dele; senão, o vigente.
export function percentualDoMes(
  status: { percentual_socia: number | null } | null | undefined,
  percentualVigente: number,
) {
  return status?.percentual_socia ?? percentualVigente;
}

// Lucro negativo também é dividido (cada um assume sua parte do prejuízo).
// A parte da sócia é arredondada primeiro; a do dono é o complemento exato.
export function dividirLucro(lucro: number, percentualSocia: number) {
  const parteSocia = Math.round(lucro * (percentualSocia / 100) * 100) / 100;
  const parteDono = Math.round((lucro - parteSocia) * 100) / 100;
  return { parteSocia, parteDono };
}

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

export function nomeMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}
