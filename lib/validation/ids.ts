export function isValidUuid(v: string): boolean {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    v.trim(),
  );
}

export function readRequiredString(formData: FormData, key: string): string {
  const raw = formData.get(key);
  const val = typeof raw === "string" ? raw.trim() : "";
  if (!val) throw new Error(`${key} ausente/vazio.`);
  return val;
}

export function readAndValidateProjectId(formData: FormData): string {
  const id = readRequiredString(formData, "project_id");
  if (!isValidUuid(id))
    throw new Error("Project ID invalido: formato UUID esperado.");
  return id;
}

export function readAndValidateReportId(formData: FormData): string {
  const id = readRequiredString(formData, "report_id");
  if (!isValidUuid(id))
    throw new Error("Report ID invalido: formato UUID esperado.");
  return id;
}
