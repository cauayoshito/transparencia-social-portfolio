-- Remover a seção "Financeiro" do conteúdo do relatório em todos os templates
-- ativos (o financeiro estruturado do relatório já cobre isso).
delete from public.template_fields
where section_id in (
  select s.id from public.template_sections s
  join public.report_templates t on t.id = s.template_id
  where t.is_active and s.title = 'Financeiro'
);
delete from public.template_sections s
using public.report_templates t
where t.id = s.template_id and t.is_active and s.title = 'Financeiro';
