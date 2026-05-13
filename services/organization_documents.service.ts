import { createClient } from "@/lib/supabase/server";

export type OrgDocumentRow = {
  id: string;
  organization_id: string;
  doc_type_code: string;
  doc_name: string;
  sent_at: string | null;
  valid_until: string | null;
  file_path: string | null;
  is_sent: boolean;
};

export async function listOrgDocuments(orgId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organization_documents")
    .select("*")
    .eq("organization_id", orgId);

  if (error) throw error;
  return (data ?? []) as OrgDocumentRow[];
}

export async function upsertOrgDocumentRow(params: {
  orgId: string;
  docTypeCode: string;
  docName: string;
  validUntil?: string | null;
  filePath?: string | null;
  isSent?: boolean;
  sentAt?: string | null;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1 linha por doc_type_code: tenta atualizar, senão cria.
  const { data: existing } = await supabase
    .from("organization_documents")
    .select("id")
    .eq("organization_id", params.orgId)
    .eq("doc_type_code", params.docTypeCode)
    .maybeSingle();

  const base = {
    organization_id: params.orgId,
    doc_type_code: params.docTypeCode,
    doc_name: params.docName,
    valid_until: params.validUntil ?? null,
    file_path: params.filePath ?? null,
    is_sent: params.isSent ?? false,
    sent_at: params.sentAt ?? null,
    uploaded_by: user?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("organization_documents")
      .update(base)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id as string;
  } else {
    const { data, error } = await supabase
      .from("organization_documents")
      .insert(base)
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }
}

export async function deleteOrgDocumentRow(docId: string) {
  const supabase = createClient();
  const { data: row, error: readErr } = await supabase
    .from("organization_documents")
    .select("id, file_path, organization_id")
    .eq("id", docId)
    .single();

  if (readErr) throw readErr;

  const { error } = await supabase
    .from("organization_documents")
    .delete()
    .eq("id", docId);
  if (error) throw error;

  return row as {
    id: string;
    file_path: string | null;
    organization_id: string;
  };
}

export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 300
) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
