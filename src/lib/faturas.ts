export function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function primeiroDiaMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function somarMeses(d: Date, meses: number) {
  return new Date(d.getFullYear(), d.getMonth() + meses, d.getDate());
}

export function formatDataBR(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDataISOBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function formatMesAnoBR(iso: string) {
  const [y, m] = iso.split("-");
  const nomes = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  return `${nomes[Number(m) - 1]}/${y.slice(2)}`;
}

// A fatura do cartão fecha e o próximo vencimento cai neste mês
// se hoje já passou do dia de vencimento; senão, é a fatura deste mês.
export function proximoVencimento(hoje: Date, diaVencimento: number) {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + (hoje.getDate() > diaVencimento ? 1 : 0);
  return new Date(ano, mes, diaVencimento);
}

// Data de vencimento de uma competência específica: sempre cai no
// dia de vencimento do cartão, dentro do próprio mês da competência.
export function vencimentoDaCompetencia(competenciaISO: string, diaVencimento: number) {
  const c = parseISODate(competenciaISO);
  return new Date(c.getFullYear(), c.getMonth(), diaVencimento);
}

// Sugestão de competência pra uma compra nova: até o dia 5 do mês,
// sugere o mês anterior (lançamento tardio de compras do fim do mês
// passado); depois do dia 5, sugere o mês vigente.
export function sugestaoCompetencia(hoje: Date) {
  const base = hoje.getDate() <= 5 ? somarMeses(hoje, -1) : hoje;
  return primeiroDiaMes(base);
}
