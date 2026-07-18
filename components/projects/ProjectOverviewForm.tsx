import { updateProjectExtendedAction } from "@/app/actions/project-extended.actions";

type ProjectLike = {
  id: string;
  project_type?: string | null;
  overview_data?: Record<string, unknown> | null;
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

// ── Campos específicos por tipo de projeto (formulários do cliente) ──
type ExtraField = {
  key: string;
  label: string;
  type?: "text" | "date" | "select" | "textarea";
  options?: string[];
  placeholder?: string;
};

const LEIS_INCENTIVO = [
  "Lei de Incentivo ao Esporte",
  "Lei Rouanet",
  "Lei da Reciclagem",
  "Fundo da Infância e Adolescência",
  "Fundo do Idoso",
];

const TYPE_EXTRA_FIELDS: Record<
  string,
  { title: string; fields: ExtraField[] }
> = {
  INCENTIVADO: {
    title: "Dados do projeto incentivado",
    fields: [
      { key: "lei_incentivo", label: "Lei de Incentivo", type: "select", options: LEIS_INCENTIVO },
      { key: "pronac", label: "Número PRONAC (se Lei Rouanet)" },
      { key: "proponente", label: "Proponente" },
      { key: "cnpj", label: "CNPJ", placeholder: "00.000.000/0000-00" },
      { key: "municipios_execucao", label: "Município(s) de execução", placeholder: "Pode ser mais de um" },
      { key: "empresa_incentivadora", label: "Empresa incentivadora" },
      { key: "valor_incentivado", label: "Valor incentivado (R$)", placeholder: "0,00" },
    ],
  },
  RECURSOS_PUBLICOS: {
    title: "Dados do edital e do termo",
    fields: [
      { key: "edital_numero", label: "Número do Edital" },
      { key: "municipio_fundo", label: "Município do Fundo" },
      { key: "conselho", label: "Conselho responsável", type: "select", options: ["CMDCA", "Fundo do Idoso"] },
      { key: "inscricao_conselho", label: "Número de inscrição no conselho" },
      { key: "termo_numero", label: "Número do Termo de Fomento/Colaboração" },
      { key: "termo_assinatura", label: "Data de assinatura", type: "date" },
      { key: "termo_vigencia", label: "Vigência" },
      { key: "valor_aprovado", label: "Valor aprovado (R$)", placeholder: "0,00" },
      { key: "eixo_atuacao", label: "Eixo de atuação" },
      { key: "publico_beneficiado", label: "Público beneficiado", type: "textarea" },
      { key: "resultados_esperados", label: "Resultados esperados", type: "textarea" },
      { key: "monitoramento", label: "Como o projeto será monitorado e avaliado?", type: "textarea" },
    ],
  },
  RECURSOS_PROPRIOS: {
    title: "Dados do investimento",
    fields: [
      { key: "municipio", label: "Município" },
      { key: "responsavel_tecnico", label: "Responsável técnico" },
      { key: "contato_telefone", label: "Telefone de contato" },
      { key: "contato_email", label: "E-mail de contato" },
      { key: "empresa_investidora", label: "Empresa investidora" },
      { key: "forma_repasse", label: "Forma de repasse", type: "select", options: ["Parcela única", "Parcelado"] },
    ],
  },
};

type Props = {
  project: ProjectLike;
};

// Item 6: opções fixas de área de atuação.
const AREA_OPTIONS = [
  "Educação",
  "Esporte",
  "Cultura",
  "Assistência Social",
  "Outros",
];

// Item 5: público-alvo (inclui criança, adolescente, idoso). Chaves alinhadas
// com as lidas em updateProjectExtendedAction (audience_<chave>).
const AUDIENCE_OPTIONS: { key: string; label: string }[] = [
  { key: "criancas", label: "Crianças" },
  { key: "adolescentes", label: "Adolescentes" },
  { key: "jovens", label: "Jovens" },
  { key: "adultos", label: "Adultos" },
  { key: "idosos", label: "Idosos" },
  { key: "mulheres", label: "Mulheres" },
  { key: "familias", label: "Famílias" },
  { key: "pessoas_rua", label: "Pessoas em situação de rua" },
  { key: "apenados", label: "Apenados e egressos" },
  { key: "grupos_minorizados", label: "Grupos minorizados" },
  { key: "migrantes", label: "Migrantes" },
  { key: "pcd", label: "Pessoas com deficiência" },
  { key: "professores", label: "Professores e facilitadores" },
  { key: "outros", label: "Outros" },
];

function toDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function toAmountInput(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProjectOverviewForm({ project }: Props) {
  const selectedAudiences = new Set(project.target_audience ?? []);
  const currentArea = String(project.area_of_action ?? "").trim();
  const areaIsCustom = currentArea.length > 0 && !AREA_OPTIONS.includes(currentArea);

  const projectType = String(project.project_type ?? "").trim().toUpperCase();
  const extraConfig = TYPE_EXTRA_FIELDS[projectType] ?? null;
  const overview = (project.overview_data ?? {}) as Record<string, unknown>;
  const extraValue = (key: string) => String(overview[key] ?? "");

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-white sm:px-6">
        Dados cadastrais do projeto
      </div>

      <form action={updateProjectExtendedAction} className="space-y-5 p-4 sm:p-6">
        <input type="hidden" name="project_id" value={project.id} />

        <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Esta seção fica editável até o envio do projeto para análise. Depois de
          enviado, os dados ficam somente leitura.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              Data de início
            </span>
            <input
              type="date"
              name="start_date"
              defaultValue={toDateInput(project.start_date)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              Data de término
            </span>
            <input
              type="date"
              name="end_date"
              defaultValue={toDateInput(project.end_date)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              UF do projeto
            </span>
            <input
              name="state_uf"
              maxLength={2}
              placeholder="Ex: SP"
              defaultValue={project.state_uf ?? ""}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm uppercase"
            />
          </label>

          {/* Item 6: Área de atuação com opções fixas */}
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              Área de atuação
            </span>
            <select
              name="area_of_action"
              defaultValue={currentArea}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Selecione…</option>
              {AREA_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              {areaIsCustom && (
                <option value={currentArea}>{currentArea}</option>
              )}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              Valor total (R$)
            </span>
            <input
              name="total_value"
              inputMode="decimal"
              placeholder="0,00"
              defaultValue={toAmountInput(project.total_value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          {/* Item 5: Quantidade de beneficiários — bloco livre */}
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              Quantidade de beneficiários
            </span>
            <input
              name="people_served"
              type="number"
              min={0}
              placeholder="Ex: 120"
              defaultValue={
                project.people_served != null ? String(project.people_served) : ""
              }
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              Coordenador/Gerente
            </span>
            <input
              name="coordinator_name"
              placeholder="Nome do responsável"
              defaultValue={project.coordinator_name ?? ""}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex items-center gap-2 text-sm sm:mt-6">
            <input
              type="checkbox"
              name="is_incentivado"
              defaultChecked={project.is_incentivado === true}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="font-medium text-slate-600">
              Projeto incentivado
            </span>
          </label>
        </div>

        {/* Item 5: Público-alvo */}
        <div>
          <p className="mb-2 text-sm font-medium text-slate-600">Público-alvo</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {AUDIENCE_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-xs text-slate-700"
              >
                <input
                  type="checkbox"
                  name={`audience_${opt.key}`}
                  defaultChecked={selectedAudiences.has(opt.key)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Campos específicos por tipo de projeto */}
        {extraConfig && (
          <div>
            <p className="mb-2 border-b border-slate-200 pb-1 text-sm font-semibold text-slate-700">
              {extraConfig.title}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {extraConfig.fields.map((f) => {
                const name = `extra__${f.key}`;
                const value = extraValue(f.key);
                if (f.type === "select") {
                  const isCustom =
                    value.length > 0 && !(f.options ?? []).includes(value);
                  return (
                    <label key={f.key} className="text-sm">
                      <span className="mb-1 block font-medium text-slate-600">
                        {f.label}
                      </span>
                      <select
                        name={name}
                        defaultValue={value}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">Selecione…</option>
                        {(f.options ?? []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                        {isCustom && <option value={value}>{value}</option>}
                      </select>
                    </label>
                  );
                }
                if (f.type === "textarea") {
                  return (
                    <label key={f.key} className="text-sm sm:col-span-2">
                      <span className="mb-1 block font-medium text-slate-600">
                        {f.label}
                      </span>
                      <textarea
                        name={name}
                        rows={2}
                        defaultValue={value}
                        placeholder={f.placeholder}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  );
                }
                return (
                  <label key={f.key} className="text-sm">
                    <span className="mb-1 block font-medium text-slate-600">
                      {f.label}
                    </span>
                    <input
                      name={name}
                      type={f.type === "date" ? "date" : "text"}
                      defaultValue={value}
                      placeholder={f.placeholder}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">
            Observações
          </span>
          <textarea
            name="observations"
            rows={3}
            defaultValue={project.observations ?? ""}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="flex justify-end">
          <button className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Salvar dados cadastrais
          </button>
        </div>
      </form>
    </section>
  );
}
