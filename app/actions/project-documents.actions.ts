// app/actions/project-documents.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";

const BUCKET = "project_documents";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; details?: unknown };

function asString(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v : "";
}

function isFile(v: FormDataEntryValue | null): v is File {
  return !!v && typeof v !== "string";
}

function sanitizeFilename(name: string) {
  const base = name.split("/").pop()?.split("\\").pop() ?? "arquivo";
  return base
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

async function getProjectOrgId(projectId: string) {
  const supabase = createClient();

  await requireUser();

  const { data, error } = await (supabase as any)
    .from("projects")
    .select("organization_id")
    .eq("id", projectId)
    .single();

  if (error || !data?.organization_id) {
    throw new Error(
      error?.message || "Projeto não encontrado (organization_id)."
    );
  }

  return String(data.organization_id);
}

/**
 * LISTA documentos do projeto
 */
export async function listProjectDocumentsAction(
  projectId: string
): Promise<ActionResult<{ documents: any[] }>> {
  try {
    const supabase = createClient();
    await requireUser();

    if (!projectId) {
      return { ok: false, error: "projectId ausente." };
    }

    const { data, error } = await (supabase as any)
      .from("project_documents")
      .select(
        "id, project_id, organization_id, uploaded_by, doc_type, document_type, file_name, mime_type, size_bytes, storage_path, created_at"
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("project_documents list error", error);
      return {
        ok: false,
        error: `Falha ao listar documentos: ${error.message}`,
        details: error,
      };
    }

    return { ok: true, data: { documents: data ?? [] } };
  } catch (e: any) {
    console.error("project_documents list exception", e);
    return {
      ok: false,
      error: e?.message || "Erro desconhecido ao listar.",
    };
  }
}

/**
 * UPLOAD real (Storage + insert na tabela project_documents)
 * Espera FormData com:
 * - project_id
 * - doc_type
 * - file
 */
export async function uploadProjectDocumentAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = createClient();
    const user = await requireUser();

    const projectId = asString(formData.get("project_id"));
    const docType = asString(formData.get("doc_type"));
    const docDescription = asString(formData.get("doc_description"));
    const fileEntry = formData.get("file");

    if (!projectId) {
      return { ok: false, error: "project_id ausente." };
    }

    if (!docType) {
      return { ok: false, error: "doc_type ausente." };
    }

    if (!isFile(fileEntry)) {
      return { ok: false, error: "Arquivo inválido." };
    }

    const orgId = await getProjectOrgId(projectId);

    const file = fileEntry;
    const safeName = sanitizeFilename(file.name || "arquivo");
    const docId = crypto.randomUUID();

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const storagePath = `${orgId}/${projectId}/${docId}_${safeName}`;

    // 1) Storage upload
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("project_documents storage upload error", uploadError);
      return {
        ok: false,
        error: `Falha no upload (Storage): ${uploadError.message}`,
        details: uploadError,
      };
    }

    // 2) DB insert
    const payload = {
      id: docId,
      project_id: projectId,
      organization_id: orgId,
      uploaded_by: user.id,
      doc_type: docType,
      document_type: docDescription || null,
      file_name: safeName,
      mime_type: file.type || null,
      size_bytes: bytes.byteLength,
      storage_path: storagePath,
    };

    console.error("project_documents payload", payload);

    const { error: insertError } = await (supabase as any)
      .from("project_documents")
      .insert(payload);

    if (insertError) {
      console.error("project_documents insert error", insertError);

      await supabase.storage.from(BUCKET).remove([storagePath]);

      return {
        ok: false,
        error: `Falha ao salvar documento (DB): ${insertError.message}`,
        details: insertError,
      };
    }

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { ok: true };
  } catch (e: any) {
    console.error("project_documents upload exception", e);
    return {
      ok: false,
      error: e?.message || "Erro desconhecido no upload.",
    };
  }
}

/**
 * SIGNED URL para baixar/visualizar
 * Espera FormData com:
 * - project_id
 * - document_id
 */
export async function getProjectDocumentSignedUrlAction(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  try {
    const supabase = createClient();
    await requireUser();

    const projectId = asString(formData.get("project_id"));
    const documentId = asString(formData.get("document_id"));

    if (!projectId) {
      return { ok: false, error: "project_id ausente." };
    }

    if (!documentId) {
      return { ok: false, error: "document_id ausente." };
    }

    const { data, error } = await (supabase as any)
      .from("project_documents")
      .select("storage_path")
      .eq("id", documentId)
      .eq("project_id", projectId)
      .single();

    if (error || !data?.storage_path) {
      console.error("project_documents signed url select error", error);
      return {
        ok: false,
        error: error?.message || "Documento não encontrado.",
        details: error,
      };
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.storage_path, 120);

    if (signError || !signed?.signedUrl) {
      console.error("project_documents signed url error", signError);
      return {
        ok: false,
        error: signError?.message || "Falha ao gerar link assinado.",
        details: signError,
      };
    }

    return { ok: true, data: { url: signed.signedUrl } };
  } catch (e: any) {
    console.error("project_documents signed url exception", e);
    return {
      ok: false,
      error: e?.message || "Erro desconhecido ao gerar URL.",
    };
  }
}

/**
 * DELETE: apaga no storage e no banco
 * Espera FormData com:
 * - project_id
 * - document_id
 */
export async function deleteProjectDocumentAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = createClient();
    await requireUser();

    const projectId = asString(formData.get("project_id"));
    const documentId = asString(formData.get("document_id"));

    if (!projectId) {
      return { ok: false, error: "project_id ausente." };
    }

    if (!documentId) {
      return { ok: false, error: "document_id ausente." };
    }

    const { data: doc, error: selError } = await (supabase as any)
      .from("project_documents")
      .select("id, storage_path")
      .eq("id", documentId)
      .eq("project_id", projectId)
      .single();

    if (selError || !doc?.id) {
      console.error("project_documents delete select error", selError);
      return {
        ok: false,
        error: selError?.message || "Documento não encontrado.",
        details: selError,
      };
    }

    if (doc.storage_path) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([doc.storage_path]);

      if (storageError) {
        console.error("project_documents delete storage error", storageError);
        return {
          ok: false,
          error: `Falha ao remover do Storage: ${storageError.message}`,
          details: storageError,
        };
      }
    }

    const { error: delError } = await (supabase as any)
      .from("project_documents")
      .delete()
      .eq("id", documentId)
      .eq("project_id", projectId);

    if (delError) {
      console.error("project_documents delete db error", delError);
      return {
        ok: false,
        error: `Falha ao remover do DB: ${delError.message}`,
        details: delError,
      };
    }

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { ok: true };
  } catch (e: any) {
    console.error("project_documents delete exception", e);
    return {
      ok: false,
      error: e?.message || "Erro desconhecido ao deletar.",
    };
  }
}
