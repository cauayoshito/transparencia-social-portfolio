-- Ajustes de template conforme formulários do cliente (Fase 2):
--   1. INCENTIVADO: "Lei de incentivo" opcional com dica "se houver";
--      remoção das seções "Financeiro" e "Evidências" (cobertas pelas
--      seções financeiras estruturadas do relatório).
--   2. Todos os tipos: nova seção "Qualitativo" (ganhos, dificuldades,
--      relato/história de participante).
-- Migration de DADOS (idempotente) — já aplicada no ambiente de dev.

-- 1a. Lei de incentivo: dica "se houver" e opcional
update public.template_fields f
set help_text='se houver', required=false
where f.key='specific.lei_incentivo'
  and f.section_id in (
    select s.id from public.template_sections s
    join public.report_templates t on t.id=s.template_id
    where t.project_type='INCENTIVADO' and t.is_active
  );

-- 1b. Remover seções Financeiro/Evidências do INCENTIVADO
delete from public.template_fields
where section_id in (
  select s.id from public.template_sections s
  join public.report_templates t on t.id=s.template_id
  where t.project_type='INCENTIVADO' and t.is_active
    and s.title in ('Financeiro','Evidências')
);
delete from public.template_sections s
using public.report_templates t
where t.id=s.template_id and t.project_type='INCENTIVADO' and t.is_active
  and s.title in ('Financeiro','Evidências');

-- 2. Seção Qualitativo nos 3 templates ativos
with tpl as (
  select distinct on (project_type) id
  from public.report_templates
  where is_active
  order by project_type, updated_at desc
),
ins_sec as (
  insert into public.template_sections (template_id, title, sort_order)
  select t.id, 'Qualitativo',
    coalesce((select max(s.sort_order) from public.template_sections s where s.template_id=t.id),0)+1
  from tpl t
  where not exists (
    select 1 from public.template_sections s
    where s.template_id=t.id and s.title='Qualitativo'
  )
  returning id, template_id
)
insert into public.template_fields (template_id, section_id, key, label, field_type, required, sort_order, help_text)
select s.template_id, s.id, f.key, f.label, f.field_type, false, f.ord, f.help
from ins_sec s
cross join (values
  ('qualitativo.ganhos','Ganhos/conquistas do período (cite até três)','long_text',1,'Ex: 1. Reconhecimento… 2. Parceria… 3. Evolução…'),
  ('qualitativo.dificuldades','Dificuldades/problemas encontrados no período (cite até três)','long_text',2,'Se houver'),
  ('qualitativo.relato','Relato/história de alguém que participa diretamente do projeto','long_text',3,'A foto da pessoa pode ser enviada no Registro fotográfico')
) as f(key,label,field_type,ord,help);
