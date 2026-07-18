import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/lib/status";

type ProjectLike = {
  id: string;
  title?: string | null;
  name?: string | null;
  status?: string | null;
  project_type?: string | null;
  organization_id?: string | null;
  linked_entity_id?: string | null;
  linked_entity_name?: string | null;
  linked_entity_type?: string | null;
  created_at?: string | null;
  description?: string | null;
  overview_data?: Record<string, unknown> | null;
  // Campos novos alinhados com PHI (tela 3.png)
  start_date?: string | null;
  end_date?: string | null;
  state_uf?: string | null;
  area_of_action?: string | null;
  total_value?: number | null;
  people_served?: number | null;
  coordinator_name?: string | null;
  observations?: string | null;
  is_incentivado?: boolean | null;
  target_audience?: string[] | null;
};

type Props = {
  project: ProjectLike;
  organizationName?: string | null;
  analystName?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

function formatCurrency(value?: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function fallback(value?: string | null, fallbackValue = "-") {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : fallbackValue;
}

function projectStatusLabel(value?: string | null) {
  const key = String(value ?? "")
    .trim()
    .toUpperCase() as ProjectStatus;
  return PROJECT_STATUS_LABEL[key] ?? fallback(value);
}

function projectTypeLabel(value?: string | null) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if (normalized === "INCENTIVADO") return "Incentivos Fiscais";
  if (normalized === "RECURSOS_PUBLICOS") return "Recursos Públicos";
  if (normalized === "RECURSOS_PROPRIOS") return "Recursos Próprios";
  return fallback(value);
}

const TARGET_AUDIENCE_LABELS: Record<string, string> = {
  criancas: "Crianças (de 0 a 12 anos)",
  adolescentes: "Adolescentes (de 13 a 18 anos)",
  jovens: "Jovens (de 15 a 29 anos)",
  adultos: "Adultos (de 30 a 59 anos)",
  idosos: "Idosos (acima de 60 anos)",
  mulheres: "Mulheres",
  familias: "Famílias",
  pessoas_rua: "Pessoas em situação de rua",
  apenados: "Apenados e egressos do sistema penitenciário",
  grupos_minorizados: "Grupos Minorizados",
  migrantes: "Migrantes",
  pcd: "Pessoas com deficiência",
  professores: "Professores e Facilitadores",
  outros: "Outros",
};

// Labels dos campos específicos por tipo (chaves em projects.overview_data)
const EXTRA_FIELD_LABELS: Record<string, { title: string; fields: [string, string][] }> = {
  INCENTIVADO: {
    title: "Dados do projeto incentivado",
    fields: [
      ["lei_incentivo", "Lei de Incentivo"],
      ["pronac", "Número PRONAC"],
      ["proponente", "Proponente"],
      ["cnpj", "CNPJ"],
      ["municipios_execucao", "Município(s) de execução"],
      ["empresa_incentivadora", "Empresa incentivadora"],
      ["valor_incentivado", "Valor incentivado (R$)"],
    ],
  },
  RECURSOS_PUBLICOS: {
    title: "Dados do edital e do termo",
    fields: [
      ["edital_numero", "Número do Edital"],
      ["municipio_fundo", "Município do Fundo"],
      ["conselho", "Conselho responsável"],
      ["inscricao_conselho", "Inscrição no conselho"],
      ["termo_numero", "Nº do Termo de Fomento/Colaboração"],
      ["termo_assinatura", "Data de assinatura"],
      ["termo_vigencia", "Vigência"],
      ["valor_aprovado", "Valor aprovado (R$)"],
      ["eixo_atuacao", "Eixo de atuação"],
      ["publico_beneficiado", "Público beneficiado"],
      ["resultados_esperados", "Resultados esperados"],
      ["monitoramento", "Monitoramento e avaliação"],
    ],
  },
  RECURSOS_PROPRIOS: {
    title: "Dados do investimento",
    fields: [
      ["municipio", "Município"],
      ["responsavel_tecnico", "Responsável técnico"],
      ["contato_telefone", "Telefone de contato"],
      ["contato_email", "E-mail de contato"],
      ["empresa_investidora", "Empresa investidora"],
      ["forma_repasse", "Forma de repasse"],
    ],
  },
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-2 border-b border-slate-100 py-2.5 text-sm last:border-b-0">
      <span className="font-medium text-slate-600">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}

export default function ProjectOverview({
  project,
  organizationName,
  analystName,
}: Props) {
  const title = project.title ?? project.name ?? "Projeto sem título";
  const audiences = project.target_audience ?? [];

  const projectTypeKey = String(project.project_type ?? "").trim().toUpperCase();
  const extraConfig = EXTRA_FIELD_LABELS[projectTypeKey] ?? null;
  const overview = (project.overview_data ?? {}) as Record<string, unknown>;
  const extraRows = extraConfig
    ? extraConfig.fields
        .map(([key, label]) => [label, String(overview[key] ?? "").trim()] as const)
        .filter(([, v]) => v.length > 0)
    : [];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header estilo PHI — dark blue */}
      <div className="bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-white sm:px-6">
        Dados cadastrais do projeto
      </div>

      <div className="p-4 sm:p-6">
        <div className="space-y-0">
          <InfoRow label="Nome do Projeto" value={fallback(title)} />
          <InfoRow
            label="Organização"
            value={fallback(organizationName, "Organização vinculada")}
          />
          <InfoRow label="Status" value={projectStatusLabel(project.status)} />
          <InfoRow
            label="Tipo"
            value={projectTypeLabel(project.project_type)}
          />

          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
            <InfoRow
              label="Data de Início"
              value={formatDate(project.start_date ?? project.created_at)}
            />
            <InfoRow label="Data de Término" value={formatDate(project.end_date)} />
          </div>

          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
            <InfoRow label="UF do Projeto" value={fallback(project.state_uf)} />
            <InfoRow
              label="Área de Atuação"
              value={fallback(project.area_of_action)}
            />
          </div>

          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
            <InfoRow
              label="Valor Total"
              value={
                project.total_value != null
                  ? formatCurrency(project.total_value)
                  : "-"
              }
            />
            <InfoRow
              label="Qtd. Pessoas Atendidas"
              value={
                project.people_served != null
                  ? String(project.people_served)
                  : "-"
              }
            />
          </div>

          <InfoRow
            label="Analista do Instituto"
            value={fallback(analystName)}
          />
          <InfoRow
            label="Coordenador/Gerente"
            value={fallback(project.coordinator_name)}
          />

          {project.is_incentivado != null && (
            <InfoRow
              label="Proj. Incentivado"
              value={project.is_incentivado ? "Sim" : "Não"}
            />
          )}

          {/* Financiador */}
          <InfoRow
            label="Financiador"
            value={fallback(
              project.linked_entity_name,
              "Nenhum financiador vinculado"
            )}
          />
        </div>

        {/* Campos específicos por tipo de projeto */}
        {extraRows.length > 0 && extraConfig && (
          <div className="mt-4">
            <p className="mb-1 text-sm font-semibold text-slate-700">
              {extraConfig.title}
            </p>
            <div className="space-y-0">
              {extraRows.map(([label, value]) => (
                <InfoRow key={label} label={label} value={value} />
              ))}
            </div>
          </div>
        )}

        {/* Público-alvo (checkboxes style do PHI) */}
        {audiences.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-slate-600">
              Público Alvo
            </p>
            <div className="flex flex-wrap gap-2">
              {audiences.map((aud) => (
                <span
                  key={aud}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                >
                  {TARGET_AUDIENCE_LABELS[aud] ?? aud}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Observações */}
        {project.observations && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Observações
            </p>
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {project.observations}
            </p>
          </div>
        )}

        {/* Resumo / Descrição */}
        {project.description && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Resumo do projeto
            </p>
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {project.description}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
