"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/services/auth.service";
import { revokeInstitutionalEntityInvite } from "@/services/institutional-entity-invites.service";

function enc(value: string) {
  return encodeURIComponent(value);
}

export async function revokeInstitutionalEntityInviteAction(formData: FormData) {
  const user = await requireUser();
  const inviteId = String(formData.get("invite_id") ?? "").trim();

  if (!inviteId) {
    redirect(
      `/dashboard/entities?error=${enc("Informe o convite que deve ser revogado.")}`
    );
  }

  try {
    await revokeInstitutionalEntityInvite(inviteId, user.id);

    revalidatePath("/dashboard/entities");
    redirect(
      `/dashboard/entities?success=${enc("Convite revogado com sucesso.")}`
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Nao foi possivel revogar o convite agora.";

    redirect(`/dashboard/entities?error=${enc(message)}`);
  }
}
