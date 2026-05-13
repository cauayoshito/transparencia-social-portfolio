"use server";

import { createClient } from "@/lib/supabase/server";

type State = { userId: string | null; error: string | null };

export async function debugAuth(
  _prevState: State,
  _formData: FormData
): Promise<State> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  console.log("[DEBUG AUTH] error:", error?.message);
  console.log("[DEBUG AUTH] user:", data?.user?.id);

  return {
    userId: data?.user?.id ?? null,
    error: error?.message ?? null,
  };
}
