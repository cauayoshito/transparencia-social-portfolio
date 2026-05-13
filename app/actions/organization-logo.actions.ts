"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateOrganization } from "@/services/organizations.service";

function safeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

export async function uploadOrganizationLogoAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const file = formData.get("logo") as File | null;

  if (!orgId || !file || file.size === 0) {
    redirect(
      `/dashboard/organizations/${orgId}?error=Selecione%20um%20arquivo`
    );
  }

  const supabase = createClient();
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "png";
  const path = `${orgId}/logo.${ext}`;
  const contentType = file.type || "application/octet-stream";

  const { error: upErr } = await supabase.storage
    .from("organization-logos")
    .upload(path, file, { upsert: true, contentType });

  if (upErr)
    redirect(
      `/dashboard/organizations/${orgId}?error=${encodeURIComponent(
        upErr.message
      )}`
    );

  await updateOrganization(orgId, { logo_path: path });

  redirect(`/dashboard/organizations/${orgId}?success=Logo%20enviado`);
}
