import {
  PROJECT_STATUS_LABEL,
  REPORT_STATUS_LABEL,
  type ProjectStatus,
  type ReportStatus,
} from "@/lib/status";

export function nomeDoEmail(email?: string | null) {
  if (!email) return "usuário";
  const nome = email.split("@")[0] ?? "usuário";
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

export function formatarDataHora(valor?: string | null) {
  if (!valor) return "-";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

export function formatarData(valor?: string | null) {
  if (!valor) return "-";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(data);
}

export function projectTypeLabel(v?: string | null) {
  const value = String(v ?? "").trim().toUpperCase();
  if (value === "RECURSOS_PROPRIOS") return "Recursos Próprios";
  if (value === "INCENTIVADO") return "Incentivado";
  if (value === "RECURSOS_PUBLICOS") return "Recursos Públicos";
  return "-";
}

export function projectStatusLabel(v?: string | null) {
  const value = String(v ?? "").trim().toUpperCase() as ProjectStatus;
  return PROJECT_STATUS_LABEL[value] ?? String(v ?? "-");
}

export function reportStatusLabel(v?: string | null) {
  const value = String(v ?? "").trim().toUpperCase() as ReportStatus;
  return REPORT_STATUS_LABEL[value] ?? String(v ?? "-");
}

/** Porcentagem simples com fallback para 0 */
export function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/** Rótulo legível para status de meta (project_goals.status) */
export function goalStatusLabel(v?: string | null): string {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "DONE") return "Concluída";
  if (s === "IN_PROGRESS") return "Em andamento";
  if (s === "BLOCKED") return "Bloqueada";
  return "Planejada";
}

/** Classes Tailwind do chip de status de meta */
export function goalStatusTone(v?: string | null): string {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "DONE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "IN_PROGRESS") return "border-blue-200 bg-blue-50 text-blue-700";
  if (s === "BLOCKED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}
