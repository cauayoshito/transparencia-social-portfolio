type SupabaseEnvDiagnostic = {
  expectedProjectRef: string | null;
  currentProjectRef: string | null;
  url: string;
  host: string;
  isConfigured: boolean;
  isExpectedProject: boolean;
  isDevelopment: boolean;
};

function getHostFromUrl(url: string): string {
  if (!url) return "";

  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function extractProjectRefFromHost(host: string): string | null {
  if (!host) return null;
  const parts = host.split(".");
  return parts.length >= 3 ? parts[0] : null;
}

function getExpectedProjectRef(): string | null {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF ??
    process.env.NEXT_PUBLIC_SUPABASE_EXPECTED_REF ??
    process.env.SUPABASE_EXPECTED_REF ??
    null
  );
}

export function getSupabaseEnvDiagnostic(): SupabaseEnvDiagnostic {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const host = getHostFromUrl(url);
  const currentProjectRef = extractProjectRefFromHost(host);
  const expectedProjectRef = getExpectedProjectRef();
  const isExpectedProject = expectedProjectRef ? currentProjectRef === expectedProjectRef : true;

  return {
    expectedProjectRef,
    currentProjectRef,
    url,
    host,
    isConfigured: Boolean(url),
    isExpectedProject,
    isDevelopment: process.env.NODE_ENV === "development",
  };
}

export function isSupabaseTableNotFoundError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the table") ||
    normalized.includes("schema cache") ||
    normalized.includes("relation") ||
    normalized.includes("does not exist")
  );
}

export function formatWrongSupabaseProjectError(baseMessage: string, details: string): string {
  const { host, expectedProjectRef, currentProjectRef, isExpectedProject } = getSupabaseEnvDiagnostic();
  const currentHost = host || "host-desconhecido";

  let hint = `Host atual: ${currentHost}. Ref atual: ${currentProjectRef ?? "desconhecido"}.`;

  if (expectedProjectRef) {
    hint += ` Ref esperada: ${expectedProjectRef}.`;
  }

  if (expectedProjectRef && !isExpectedProject) {
    hint += " Possivel mismatch de ambiente.";
  }

  return `${baseMessage}: ${details} ${hint}`;
}
