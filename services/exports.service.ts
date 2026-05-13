import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/services/audit.service";
import type { Database } from "@/types/database";

type ReportExportRow = Database["public"]["Tables"]["report_exports"]["Row"];
export type ReportExportWithUrl = ReportExportRow & { signed_url: string | null };

export async function createExportRecord(
  reportId: string,
  versionNumber: number,
  filePath: string,
  userId: string,
): Promise<ReportExportRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("report_exports")
    .insert({
      report_id: reportId,
      version_number: versionNumber,
      file_path: filePath,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Falha ao criar registro de exportacao: ${error.message}`);
  }

  await logAction(
    "generate_export_record",
    "report_export",
    (data as ReportExportRow).id,
    {
      report_id: reportId,
      version_number: versionNumber,
      file_path: filePath,
    },
    userId,
    { softFail: true },
  );

  return data as ReportExportRow;
}

export async function listExportsByReport(reportId: string): Promise<ReportExportWithUrl[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("report_exports")
    .select("*")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Falha ao listar exportacoes: ${error.message}`);
  }

  const exportsRows = (data ?? []) as ReportExportRow[];
  const exportsWithUrl = await Promise.all(
    exportsRows.map(async (item) => {
      const { data: signed, error: signedError } = await supabase.storage
        .from("reports")
        .createSignedUrl(item.file_path, 60 * 30);

      if (signedError) {
        return { ...item, signed_url: null };
      }

      return { ...item, signed_url: signed.signedUrl };
    }),
  );

  return exportsWithUrl;
}
