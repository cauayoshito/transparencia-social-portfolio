"use client";

import { useActionState } from "react";
import { debugAuth } from "./actions";

type State = { userId: string | null; error: string | null };
const initialState: State = { userId: null, error: null };

export default function DebugForm() {
  const [state, action, pending] = useActionState(debugAuth, initialState);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <form action={action}>
        <button type="submit" disabled={pending}>
          {pending ? "Testando..." : "Testar Auth"}
        </button>
      </form>

      <pre style={{ marginTop: 16 }}>{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
}
