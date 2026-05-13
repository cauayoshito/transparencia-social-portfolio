import { createClient } from "@/lib/supabase/server";

type ProjectStatusRpcName =
  | "phi_submit_project"
  | "phi_start_review"
  | "phi_approve_project"
  | "phi_reject_project"
  | "phi_resubmit_project";

type RpcErrorLike = {
  message: string;
  details: string | null;
  hint: string | null;
  code: string | null;
};

type ProjectStatusError = {
  rpc: ProjectStatusRpcName;
  code: string | null;
  message: string;
  details: string | null;
  hint: string | null;
  projectId: string;
};

type ProjectStatusSuccess = {
  ok: true;
  rpc: ProjectStatusRpcName;
};

type ProjectStatusFailure = {
  ok: false;
  error: ProjectStatusError;
};

export type ProjectStatusResult = ProjectStatusSuccess | ProjectStatusFailure;

type RpcClient = {
  rpc: (
    fn: ProjectStatusRpcName,
    params: Record<string, unknown>,
  ) => Promise<{ error: RpcErrorLike | null }>;
};

function formatRpcFailure(rpc: ProjectStatusRpcName, projectId: string, error: RpcErrorLike): ProjectStatusFailure {
  return {
    ok: false,
    error: {
      rpc,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      projectId,
    },
  };
}

async function callProjectRpc(
  rpc: ProjectStatusRpcName,
  projectId: string,
  reason?: string,
): Promise<ProjectStatusResult> {
  const supabase = createClient() as unknown as RpcClient;
  const payloads: Record<string, unknown>[] = reason
    ? [
        { p_project_id: projectId, p_reason: reason },
        { project_id: projectId, reason },
        { _project_id: projectId, _reason: reason },
      ]
    : [{ p_project_id: projectId }, { project_id: projectId }, { _project_id: projectId }];

  let lastError: RpcErrorLike | null = null;

  for (const payload of payloads) {
    const { error } = await supabase.rpc(rpc, payload);

    if (!error) {
      return { ok: true, rpc };
    }

    lastError = error;
  }

  return formatRpcFailure(
    rpc,
    projectId,
    lastError ?? {
      code: "UNKNOWN_RPC_ERROR",
      message: "Falha desconhecida ao executar RPC.",
      details: null,
      hint: null,
    },
  );
}

export async function submitProject(projectId: string): Promise<ProjectStatusResult> {
  return callProjectRpc("phi_submit_project", projectId);
}

export async function startReview(projectId: string): Promise<ProjectStatusResult> {
  return callProjectRpc("phi_start_review", projectId);
}

export async function approveProject(projectId: string): Promise<ProjectStatusResult> {
  return callProjectRpc("phi_approve_project", projectId);
}

export async function rejectProject(projectId: string, reason: string): Promise<ProjectStatusResult> {
  return callProjectRpc("phi_reject_project", projectId, reason);
}

export async function resubmitProject(projectId: string): Promise<ProjectStatusResult> {
  return callProjectRpc("phi_resubmit_project", projectId);
}
