import { redirect } from "next/navigation";

/**
 * A rota /dashboard/entities foi descontinuada.
 * O conceito de "entidades" foi absorvido pelo fluxo de organizações.
 * Qualquer acesso (bookmark, link antigo) redireciona para organizações.
 */
export default function EntitiesRedirectPage() {
  redirect("/dashboard/organizations");
}
