"use client";

import { useState, useTransition } from "react";
import { debugAuth } from "./actions";

type State = { userId: string | null; error: string | null };
const initialState: State = { userId: null, error: null };

export default function DebugForm() {
  const [state, setState] = useState<State>(initialState);
  const [pending, startTransition] = useTransition();

  function onTest() {
    startTransition(async () => {
      const result = await debugAuth(state, new FormData());
      setState(result);
    });
  }

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <button type="button" onClick={onTest} disabled={pending}>
        {pending ? "Testando..." : "Testar Auth"}
      </button>

      <pre style={{ marginTop: 16 }}>{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
}
