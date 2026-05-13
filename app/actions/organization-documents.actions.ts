"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  deleteOrgDocumentRow,
  upsertOrgDocumentRow,
} from "@/services/organization_documents.service";

function safeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

export async function uploadOrganizationDocumentAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const docTypeCode = String(formData.get("doc_type_code") ?? "");
  const docName = String(formData.get("doc_name") ?? "");
  const validUntil = String(formData.get("valid_until") ?? "") || null;
  const file = formData.get("file") as File | null;

  if (!orgId || !docTypeCode || !docName) {
    redirect(
      `/dashboard/organizations/${orgId}/documents?error=Parametros%20invalidos`
    );
  }

  const supabase = createClient();

  let filePath: string | null = null;
  if (file && file.size > 0) {
    const filename = `${Date.now()}-${safeFileName(file.name)}`;
    filePath = `${orgId}/${docTypeCode}/${filename}`;

    const { error: upErr } = await supabase.storage
      .from("organization-documents")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type || "application/octet-stream",
      });

    if (upErr)
      redirect(
        `/dashboard/organizations/${orgId}/documents?error=${encodeURIComponent(
          upErr.message
        )}`
      );
  }

  await upsertOrgDocumentRow({
    orgId,
    docTypeCode,
    docName,
    validUntil,
    filePath,
    isSent: !!filePath,
    sentAt: filePath ? new Date().toISOString().slice(0, 10) : null,
  });

  redirect(
    `/dashboard/organizations/${orgId}/documents?success=Documento%20salvo`
  );
}

export async function deleteOrganizationDocumentAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const docId = String(formData.get("docId") ?? "");
  if (!orgId || !docId)
    redirect(
      `/dashboard/organizations/${orgId}/documents?error=Parametros%20invalidos`
    );

  const supabase = createClient();
  const row = await deleteOrgDocumentRow(docId);

  if (row.file_path) {
    await supabase.storage
      .from("organization-documents")
      .remove([row.file_path]);
  }

  redirect(`/dashboard/organizations/${orgId}/documents?success=Excluido`);
}
