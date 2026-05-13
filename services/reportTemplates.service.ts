import { getReportTemplateForProjectType } from "@/services/reports.service";

export async function getActiveTemplateForProjectType(projectType: string) {
  return getReportTemplateForProjectType(projectType);
}


