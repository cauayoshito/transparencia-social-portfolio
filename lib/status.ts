export const PROJECT_STATUS = [
  "DRAFT",
  "ENVIADO",
  "EM_ANALISE",
  "APROVADO",
  "DEVOLVIDO",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUS)[number];

export const REPORT_STATUS = [
  "DRAFT",
  "SUBMITTED",
  "RETURNED",
  "APPROVED",
] as const;
export type ReportStatus = (typeof REPORT_STATUS)[number];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  DRAFT: "Rascunho",
  ENVIADO: "Enviado",
  EM_ANALISE: "Em análise",
  APROVADO: "Aprovado",
  DEVOLVIDO: "Devolvido",
};

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  DRAFT: "Rascunho",
  SUBMITTED: "Enviado",
  RETURNED: "Devolvido",
  APPROVED: "Aprovado",
};

export const PROJECT_FLOW: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ["ENVIADO"],
  ENVIADO: ["EM_ANALISE"],
  EM_ANALISE: ["APROVADO", "DEVOLVIDO"],
  APROVADO: [],
  DEVOLVIDO: ["ENVIADO"],
};

export const REPORT_FLOW: Record<ReportStatus, ReportStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["APPROVED", "RETURNED"],
  RETURNED: ["SUBMITTED"],
  APPROVED: [],
};
