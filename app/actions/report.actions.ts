"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { logAction } from "@/services/audit.service";
import { createExportRecord } from "@/services/exports.service";
import { getActiveTemplateForProjectType } from "@/services/reportTemplates.service";
import {
  approveReport,
  getCurrentVersion,
  getReport,
  reopenToDraft,
  returnReport,
  saveDraft,
  submitReport,
  recommendReport,
} from "@/services/reports.service";
import { getProjectByIdForUser } from "@/services/projects.service";
import type { Json } from "@/types/database";

const REPORTS_BUCKET = "reports";

const REPORT_PERIOD_TYPES = ["MONTHLY"] as const;
type ReportPeriodType = (typeof REPORT_PERIOD_TYPES)[number];

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

type TemplateField = { key: string };
type TemplateSection = { fields: TemplateField[] };
type TemplateData = { sections: TemplateSection[] };

function parseFormDataToJson(formData: FormData): Json {
  const result: Record<string, Json> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("field__")) {
      const fieldKey = key.replace("field__", "");
      result[fieldKey] = typeof value === "string" ? value : "";
    }
  }
  return result;
}

function normalizeReportPeriodType(value: string): ReportPeriodType {
  const normalized = value.trim().toUpperCase();
  if (normalized === "MONTHY") return "MONTHLY";
  if ((REPORT_PERIOD_TYPES as readonly string[]).includes(normalized)) {
    return normalized as ReportPeriodType;
  }
  throw new Error(
    `period_type invalido: ${value}. Valores aceitos: ${REPORT_PERIOD_TYPES.join(
      ", "
    )}.`
  );
}

function toIsoDateLocal(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthPeriod(): {
  periodType: ReportPeriodType;
  periodStart: string;
  periodEnd: string;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return {
    periodType: normalizeReportPeriodType("MONTHLY"),
    periodStart: toIsoDateLocal(firstDay),
    periodEnd: toIsoDateLocal(lastDay),
  };
}

function createStubPdfBuffer(reportId: string, versionNumber: number): Buffer {
  const text = `Report ${reportId} v${versionNumber}`;
  const escapedText = text.replace(/[()\\]/g, "\\$&");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${
      `BT /F1 18 Tf 72 770 Td (${escapedText}) Tj ET`.length
    } >>\nstream\nBT /F1 18 Tf 72 770 Td (${escapedText}) Tj ET\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let body = "";
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength("%PDF-1.4\n" + body, "utf8"));
    body += object;
  }

  const xrefStart = Buffer.byteLength("%PDF-1.4\n" + body, "utf8");
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${
    objects.length + 1
  } /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(`%PDF-1.4\n${body}${xref}${trailer}`, "utf8");
}

function isNextRedirectError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const digest = (err as any).digest;
  return typeof digest === "string" && digest.includes("NEXT_REDIRECT");
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// =========================
// P0: Criar
// =========================

export async function createReportAction(formData: FormData) {
  const user = await requireUser();

  // Novo fluxo: ORG cria relatórios. INVESTOR também pode criar.
  const { getUserContext } = await import("@/services/membership.service");
  const { getPrimaryRole } = await import("@/lib/roles");
  const ctx = await getUserContext(user.id);
  const role = getPrimaryRole(ctx);

  if (role !== "ORG" && role !== "INVESTOR") {
    throw new Error("Apenas organizações ou financiadores podem criar relatórios.");
  }

  const projectId = String(formData.get("project_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  const periodTypeRaw = String(formData.get("period_type") ?? "MONTHLY");
  const periodType = normalizeReportPeriodType(periodTypeRaw);

  const defaults = getCurrentMonthPeriod();
  const periodStart =
    String(formData.get("period_start") ?? "").trim() || defaults.periodStart;
  const periodEnd =
    String(formData.get("period_end") ?? "").trim() || defaults.periodEnd;

  if (!projectId) throw new Error("Selecione um projeto.");

  const project = await getProjectByIdForUser(projectId, user.id);
  if (!project) throw new Error("Projeto não encontrado ou sem acesso.");

  const templateData = (await getActiveTemplateForProjectType(
    project.project_type
  )) as TemplateData | null;

  const supabase = createClient();
  const db = supabase as any;

  const { data: report, error: reportError } = await db
    .schema("public")
    .from("reports")
    .insert({
      project_id: project.id,
      title: title || null,
      period_type: periodType,
      period_start: periodStart,
      period_end: periodEnd,
      status: "DRAFT",
      current_version: 1,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (reportError || !report) {
    const rawError = reportError?.message ?? "erro desconhecido";
    if (rawError.toLowerCase().includes("report_period_type")) {
      throw new Error(
        `Falha ao criar relatório: period_type deve ser ${REPORT_PERIOD_TYPES.join(
          ", "
        )}.`
      );
    }
    throw new Error(`Falha ao criar relatório: ${rawError}`);
  }

  const initialData: Record<string, Json> = {};
  if (templateData?.sections?.length) {
    templateData.sections.forEach((section: TemplateSection) => {
      section.fields.forEach((field: TemplateField) => {
        initialData[field.key] = "";
      });
    });
  }

  const { error: versionError } = await db
    .schema("public")
    .from("report_versions")
    .insert({
      report_id: report.id,
      version_number: 1,
      status: "DRAFT",
      data: initialData,
      created_by: user.id,
    });

  if (versionError) {
    throw new Error(`Falha ao criar versão inicial: ${versionError.message}`);
  }

  await logAction(
    "create_report",
    "report",
    report.id,
    {
      project_id: project.id,
      period_type: periodType,
      period_start: periodStart,
      period_end: periodEnd,
      current_version: 1,
    },
    user.id
  );

  revalidatePath(`/dashboard/projects/${project.id}`);
  revalidatePath(`/dashboard/reports`);

  // Relatório recém-criado já abre na tela de preenchimento (não no detalhe
  // somente-leitura) — o usuário não precisa clicar em "Digitar relatório".
  redirect(`/dashboard/reports/${report.id}/edit`);
}

// =========================
// P0: Salvar rascunho
// =========================

export async function saveReportDraftAction(
  reportId: string,
  formData: FormData
) {
  const user = await requireUser();
  const dataJson = parseFormDataToJson(formData);
  const report = await getReport(reportId, user.id);

  await saveDraft(reportId, dataJson, user.id);

  revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath(`/dashboard/projects/${(report as any).project_id}`);
}

export async function saveReportDraftFromEditorAction(
  reportId: string,
  formData: FormData
) {
  const user = await requireUser();
  const dataJson = parseFormDataToJson(formData);
  const report = await getReport(reportId, user.id);

  await saveDraft(reportId, dataJson, user.id);

  revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath(`/dashboard/reports/${reportId}/edit`);
  revalidatePath(`/dashboard/projects/${(report as any).project_id}`);

  redirect(`/dashboard/reports/${reportId}/edit?saved=1`);
}

// =========================
// P0: Status
// =========================

export async function submitReportAction(
  reportId: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const report = await getReport(reportId, user.id);

    await submitReport(reportId, user.id);

    revalidatePath(`/dashboard/reports/${reportId}`);
    revalidatePath(`/dashboard/projects/${(report as any).project_id}`);
    revalidatePath(`/dashboard/reports`);

    return { ok: true, message: "Relatório enviado com sucesso." };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Falha ao enviar relatório.",
    };
  }
}

export async function reopenReportToDraftAction(
  reportId: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const report = await getReport(reportId, user.id);

    await reopenToDraft(reportId, user.id);

    revalidatePath(`/dashboard/reports/${reportId}`);
    revalidatePath(`/dashboard/projects/${(report as any).project_id}`);
    revalidatePath(`/dashboard/reports`);

    return { ok: true, message: "Relatório reaberto para rascunho." };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Falha ao reabrir relatório.",
    };
  }
}

// =========================
// Reviews
// =========================

export async function approveReportAction(reportId: string, comment: string) {
  const user = await requireUser();
  const report = await getReport(reportId, user.id);

  await approveReport(reportId, comment, user.id);

  revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath(`/dashboard/projects/${(report as any).project_id}`);
  revalidatePath(`/dashboard/reports`);
}

/**
 * P3.1: Consultor emite recomendação de aprovação SEM mudar status.
 */
export async function recommendApprovalAction(
  reportId: string,
  comment: string
) {
  const user = await requireUser();
  const report = await getReport(reportId, user.id);

  await recommendReport(reportId, comment, user.id);

  revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath(`/dashboard/projects/${(report as any).project_id}`);
  revalidatePath(`/dashboard/reports`);
}

export async function returnReportAction(reportId: string, comment: string) {
  const user = await requireUser();
  const report = await getReport(reportId, user.id);

  await returnReport(reportId, comment, user.id);

  revalidatePath(`/dashboard/reports/${reportId}`);
  revalidatePath(`/dashboard/projects/${(report as any).project_id}`);
  revalidatePath(`/dashboard/reports`);
}

// =========================
// Export (stub)
// =========================

export async function exportReportToPdfStubAction(
  reportId: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const report = await getReport(reportId, user.id);
    const currentVersion = await getCurrentVersion(reportId);

    const versionNumber = (currentVersion as any)?.version_number ?? 1;
    const filePath = `${reportId}/v${versionNumber}.pdf`;
    const pdfBuffer = createStubPdfBuffer(reportId, versionNumber);

    const supabase = createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return {
        ok: false,
        error: "Falha ao identificar usuário autenticado para exportação.",
      };
    }

    const { error: uploadError } = await supabase.storage
      .from(REPORTS_BUCKET)
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      const message = uploadError.message
        .toLowerCase()
        .includes("bucket not found")
        ? "Falha ao enviar PDF para Storage: bucket 'reports' não encontrado."
        : `Falha ao enviar PDF para Storage: ${uploadError.message}`;
      return { ok: false, error: message };
    }

    await createExportRecord(reportId, versionNumber, filePath, authUser.id);

    revalidatePath(`/dashboard/reports/${reportId}`);
    revalidatePath(`/dashboard/projects/${(report as any).project_id}`);
    revalidatePath(`/dashboard/reports`);

    return { ok: true, message: `Arquivo gerado em reports/${filePath}.` };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao exportar PDF.",
    };
  }
}

// =========================
// P1: Duplicar / Excluir
// =========================

export async function duplicateReportAction(
  reportId: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const { duplicateReport } = await import("@/services/reports.service");
    const newReport = await duplicateReport(reportId, user.id);

    revalidatePath("/dashboard/reports");
    revalidatePath(`/dashboard/projects/${(newReport as any).project_id}`);

    redirect(`/dashboard/reports/${(newReport as any).id}`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Falha ao duplicar relatório.",
    };
  }
}

export async function deleteReportAction(
  reportId: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const report = await getReport(reportId, user.id);

    const { deleteReport } = await import("@/services/reports.service");
    await deleteReport(reportId, user.id);

    revalidatePath("/dashboard/reports");
    revalidatePath(`/dashboard/projects/${(report as any).project_id}`);

    return { ok: true, message: "Relatório excluído." };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Falha ao excluir relatório.",
    };
  }
}

// =========================
// P1: Registro Fotográfico (foto)
// =========================

type PhotoItem = {
  path: string;
  name: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  caption?: string | null;
};

export async function uploadReportPhotoAction(
  reportId: string,
  formData: FormData
) {
  const go = (q: string) => redirect(`/dashboard/reports/${reportId}/edit${q}`);

  try {
    const user = await requireUser();
    const report = await getReport(reportId, user.id);

    const file = formData.get("photo") as File | null;
    const caption = String(formData.get("caption") ?? "").trim() || null;

    if (!file || typeof (file as any).arrayBuffer !== "function") {
      return go(`?err=${encodeURIComponent("Selecione um arquivo.")}`);
    }

    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      return go(
        `?err=${encodeURIComponent("Arquivo muito grande. Máximo: 8MB.")}`
      );
    }

    // Spec do cliente: até 15 fotos por relatório.
    const versionForLimit = await getCurrentVersion(reportId);
    const existingPhotos =
      ((versionForLimit as any)?.data as any)?.__assets?.photos ?? [];
    if (Array.isArray(existingPhotos) && existingPhotos.length >= 15) {
      return go(
        `?err=${encodeURIComponent("Limite de 15 fotos por relatório atingido.")}`
      );
    }

    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    const clean = safeFileName(file.name || "foto.jpg");
    const path = `${reportId}/photos/${stamp}-${clean}`;

    const supabase = createClient();

    const { error: uploadErr } = await supabase.storage
      .from(REPORTS_BUCKET)
      .upload(path, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadErr) {
      return go(
        `?err=${encodeURIComponent(
          `Falha ao enviar foto: ${uploadErr.message}`
        )}`
      );
    }

    const current = await getCurrentVersion(reportId);
    const baseData = ((current as any)?.data as any) ?? {};
    const assets = baseData.__assets ?? {};
    const photos: PhotoItem[] = Array.isArray(assets.photos)
      ? assets.photos
      : [];

    const item: PhotoItem = {
      path,
      name: clean,
      size: file.size,
      contentType: file.type || "application/octet-stream",
      uploadedAt: now.toISOString(),
      caption,
    };

    const nextData = {
      ...baseData,
      __assets: {
        ...assets,
        photos: [item, ...photos],
        attachments: assets.attachments ?? {
          receipts: [],
          bank_statements: [],
          others: [],
        },
      },
    };

    await saveDraft(reportId, nextData as any, user.id);
    await logAction(
      "upload_report_photo",
      "report",
      reportId,
      { path },
      user.id
    );

    revalidatePath(`/dashboard/reports/${reportId}/edit`);
    revalidatePath(`/dashboard/reports/${reportId}`);
    revalidatePath(`/dashboard/reports`);
    revalidatePath(`/dashboard/projects/${(report as any).project_id}`);

    return go(`?photo=1`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return go(
      `?err=${encodeURIComponent(
        error instanceof Error ? error.message : "Falha ao enviar foto."
      )}`
    );
  }
}

export async function removeReportPhotoAction(
  reportId: string,
  formData: FormData
) {
  const go = (q: string) => redirect(`/dashboard/reports/${reportId}/edit${q}`);

  try {
    const user = await requireUser();
    const report = await getReport(reportId, user.id);

    const path = String(formData.get("path") ?? "").trim();
    if (!path) return go(`?err=${encodeURIComponent("Path inválido.")}`);

    const current = await getCurrentVersion(reportId);
    const baseData = ((current as any)?.data as any) ?? {};
    const assets = baseData.__assets ?? {};
    const photos: PhotoItem[] = Array.isArray(assets.photos)
      ? assets.photos
      : [];

    const nextPhotos = photos.filter((p) => p.path !== path);

    const nextData = {
      ...baseData,
      __assets: {
        ...assets,
        photos: nextPhotos,
        attachments: assets.attachments ?? {
          receipts: [],
          bank_statements: [],
          others: [],
        },
      },
    };

    const supabase = createClient();
    await supabase.storage.from(REPORTS_BUCKET).remove([path]);

    await saveDraft(reportId, nextData as any, user.id);
    await logAction(
      "remove_report_photo",
      "report",
      reportId,
      { path },
      user.id
    );

    revalidatePath(`/dashboard/reports/${reportId}/edit`);
    revalidatePath(`/dashboard/reports/${reportId}`);
    revalidatePath(`/dashboard/reports`);
    revalidatePath(`/dashboard/projects/${(report as any).project_id}`);

    return go(`?removed=1`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return go(
      `?err=${encodeURIComponent(
        error instanceof Error ? error.message : "Falha ao remover foto."
      )}`
    );
  }
}

// =========================
// P1: Anexos (3 blocos)
// =========================

type AttachmentItem = {
  path: string;
  name: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  description?: string | null;
};

function ensureAssetsShape(baseData: any) {
  const assets = baseData.__assets ?? {};
  return {
    ...baseData,
    __assets: {
      photos: Array.isArray(assets.photos) ? assets.photos : [],
      attachments: {
        receipts: Array.isArray(assets.attachments?.receipts)
          ? assets.attachments.receipts
          : [],
        bank_statements: Array.isArray(assets.attachments?.bank_statements)
          ? assets.attachments.bank_statements
          : [],
        others: Array.isArray(assets.attachments?.others)
          ? assets.attachments.others
          : [],
      },
    },
  };
}

async function uploadAttachmentCommon(
  reportId: string,
  userId: string,
  file: File,
  description: string | null,
  folder: "receipts" | "bank_statements" | "others"
) {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const clean = safeFileName(file.name || "arquivo");
  const path = `${reportId}/attachments/${folder}/${stamp}-${clean}`;

  const supabase = createClient();

  const { error: uploadErr } = await supabase.storage
    .from(REPORTS_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadErr)
    throw new Error(`Falha ao enviar arquivo: ${uploadErr.message}`);

  const current = await getCurrentVersion(reportId);
  const baseData = ensureAssetsShape(((current as any)?.data as any) ?? {});
  const assets = baseData.__assets;

  const item: AttachmentItem = {
    path,
    name: clean,
    size: file.size,
    contentType: file.type || "application/octet-stream",
    uploadedAt: now.toISOString(),
    description,
  };

  const nextData = {
    ...baseData,
    __assets: {
      ...assets,
      attachments: {
        ...assets.attachments,
        [folder]: [item, ...(assets.attachments[folder] as AttachmentItem[])],
      },
    },
  };

  await saveDraft(reportId, nextData as any, userId);
  await logAction(
    "upload_report_attachment",
    "report",
    reportId,
    { path, folder },
    userId
  );

  return { path };
}

async function removeAttachmentCommon(
  reportId: string,
  userId: string,
  path: string,
  folder: "receipts" | "bank_statements" | "others"
) {
  const current = await getCurrentVersion(reportId);
  const baseData = ensureAssetsShape(((current as any)?.data as any) ?? {});
  const assets = baseData.__assets;

  const list = assets.attachments[folder] as AttachmentItem[];
  const nextList = list.filter((i) => i.path !== path);

  const nextData = {
    ...baseData,
    __assets: {
      ...assets,
      attachments: {
        ...assets.attachments,
        [folder]: nextList,
      },
    },
  };

  const supabase = createClient();
  await supabase.storage.from(REPORTS_BUCKET).remove([path]);

  await saveDraft(reportId, nextData as any, userId);
  await logAction(
    "remove_report_attachment",
    "report",
    reportId,
    { path, folder },
    userId
  );

  return { ok: true };
}

export async function uploadReportReceiptAction(
  reportId: string,
  formData: FormData
) {
  const go = (q: string) => redirect(`/dashboard/reports/${reportId}/edit${q}`);

  try {
    const user = await requireUser();
    await getReport(reportId, user.id);

    const file = formData.get("file") as File | null;
    const description =
      String(formData.get("description") ?? "").trim() || null;

    if (!file || typeof (file as any).arrayBuffer !== "function") {
      return go(
        `?err=${encodeURIComponent("Selecione um arquivo para Nota/Recibo.")}`
      );
    }

    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      return go(
        `?err=${encodeURIComponent("Arquivo muito grande. Máximo: 15MB.")}`
      );
    }

    const okType =
      (file.type || "").startsWith("image/") || file.type === "application/pdf";
    if (!okType) {
      return go(
        `?err=${encodeURIComponent("Formato inválido. Envie PDF ou imagem.")}`
      );
    }

    await uploadAttachmentCommon(
      reportId,
      user.id,
      file,
      description,
      "receipts"
    );

    revalidatePath(`/dashboard/reports/${reportId}/edit`);
    return go(`?receipt=1`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return go(
      `?err=${encodeURIComponent(
        error instanceof Error ? error.message : "Falha ao enviar anexo."
      )}`
    );
  }
}

export async function uploadReportBankStatementAction(
  reportId: string,
  formData: FormData
) {
  const go = (q: string) => redirect(`/dashboard/reports/${reportId}/edit${q}`);

  try {
    const user = await requireUser();
    await getReport(reportId, user.id);

    const file = formData.get("file") as File | null;
    const description =
      String(formData.get("description") ?? "").trim() || null;

    if (!file || typeof (file as any).arrayBuffer !== "function") {
      return go(
        `?err=${encodeURIComponent("Selecione um arquivo de extrato.")}`
      );
    }

    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      return go(
        `?err=${encodeURIComponent("Arquivo muito grande. Máximo: 20MB.")}`
      );
    }

    const okType =
      (file.type || "").startsWith("image/") || file.type === "application/pdf";
    if (!okType) {
      return go(
        `?err=${encodeURIComponent("Formato inválido. Envie PDF ou imagem.")}`
      );
    }

    await uploadAttachmentCommon(
      reportId,
      user.id,
      file,
      description,
      "bank_statements"
    );

    revalidatePath(`/dashboard/reports/${reportId}/edit`);
    return go(`?bank=1`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return go(
      `?err=${encodeURIComponent(
        error instanceof Error ? error.message : "Falha ao enviar extrato."
      )}`
    );
  }
}

export async function uploadReportOtherAttachmentAction(
  reportId: string,
  formData: FormData
) {
  const go = (q: string) => redirect(`/dashboard/reports/${reportId}/edit${q}`);

  try {
    const user = await requireUser();
    await getReport(reportId, user.id);

    const file = formData.get("file") as File | null;
    const description =
      String(formData.get("description") ?? "").trim() || null;

    if (!file || typeof (file as any).arrayBuffer !== "function") {
      return go(`?err=${encodeURIComponent("Selecione um arquivo.")}`);
    }

    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      return go(
        `?err=${encodeURIComponent("Arquivo muito grande. Máximo: 20MB.")}`
      );
    }

    const okType =
      (file.type || "").startsWith("image/") || file.type === "application/pdf";
    if (!okType) {
      return go(
        `?err=${encodeURIComponent("Formato inválido. Envie PDF ou imagem.")}`
      );
    }

    await uploadAttachmentCommon(
      reportId,
      user.id,
      file,
      description,
      "others"
    );

    revalidatePath(`/dashboard/reports/${reportId}/edit`);
    return go(`?other=1`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return go(
      `?err=${encodeURIComponent(
        error instanceof Error ? error.message : "Falha ao enviar arquivo."
      )}`
    );
  }
}

export async function removeReportReceiptAction(
  reportId: string,
  formData: FormData
) {
  const go = (q: string) => redirect(`/dashboard/reports/${reportId}/edit${q}`);

  try {
    const user = await requireUser();
    await getReport(reportId, user.id);

    const path = String(formData.get("path") ?? "").trim();
    if (!path) return go(`?err=${encodeURIComponent("Path inválido.")}`);

    await removeAttachmentCommon(reportId, user.id, path, "receipts");

    revalidatePath(`/dashboard/reports/${reportId}/edit`);
    return go(`?removed=1`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return go(
      `?err=${encodeURIComponent(
        error instanceof Error ? error.message : "Falha ao remover anexo."
      )}`
    );
  }
}

export async function removeReportBankStatementAction(
  reportId: string,
  formData: FormData
) {
  const go = (q: string) => redirect(`/dashboard/reports/${reportId}/edit${q}`);

  try {
    const user = await requireUser();
    await getReport(reportId, user.id);

    const path = String(formData.get("path") ?? "").trim();
    if (!path) return go(`?err=${encodeURIComponent("Path inválido.")}`);

    await removeAttachmentCommon(reportId, user.id, path, "bank_statements");

    revalidatePath(`/dashboard/reports/${reportId}/edit`);
    return go(`?removed=1`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return go(
      `?err=${encodeURIComponent(
        error instanceof Error ? error.message : "Falha ao remover extrato."
      )}`
    );
  }
}

export async function removeReportOtherAttachmentAction(
  reportId: string,
  formData: FormData
) {
  const go = (q: string) => redirect(`/dashboard/reports/${reportId}/edit${q}`);

  try {
    const user = await requireUser();
    await getReport(reportId, user.id);

    const path = String(formData.get("path") ?? "").trim();
    if (!path) return go(`?err=${encodeURIComponent("Path inválido.")}`);

    await removeAttachmentCommon(reportId, user.id, path, "others");

    revalidatePath(`/dashboard/reports/${reportId}/edit`);
    return go(`?removed=1`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return go(
      `?err=${encodeURIComponent(
        error instanceof Error ? error.message : "Falha ao remover arquivo."
      )}`
    );
  }
}
