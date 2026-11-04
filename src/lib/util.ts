export function fmtData(d: string | Date | null | undefined): string {
  if (!d) return "";
  const s = typeof d === "string" ? d : d.toISOString().slice(0, 10);
  const [y, m, day] = s.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

export function fmtDataHora(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function hojeISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export const STATUS_LABEL: Record<string, string> = {
  planejamento: "Em planejamento",
  realizado: "Realizado",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};
