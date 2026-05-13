import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: uid } = await supabase.rpc("debug_auth_uid");

  return Response.json({
    userIdFromAuth: user?.id ?? null,
    authUidFromDb: uid ?? null,
  });
}
