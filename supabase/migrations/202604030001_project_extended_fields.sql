-- ============================================================================
-- Migration: Campos estendidos de projeto (alinhamento com protótipo PHI)
-- Tela 3.png: Dados do Projeto exibe UF, área de atuação, público-alvo,
-- datas início/término, valor total, analista, coordenador, qtd atendidos, etc.
-- Tela 3.1.png: Relatórios do Projeto com campos de datas de workflow
-- ============================================================================

-- 1. Campos extras no projeto para alinhar com tela "Dados do Projeto" do PHI
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS state_uf          text,
  ADD COLUMN IF NOT EXISTS area_of_action    text,
  ADD COLUMN IF NOT EXISTS target_audience   text[],
  ADD COLUMN IF NOT EXISTS start_date        date,
  ADD COLUMN IF NOT EXISTS end_date          date,
  ADD COLUMN IF NOT EXISTS total_value       numeric(15,2),
  ADD COLUMN IF NOT EXISTS people_served     integer,
  ADD COLUMN IF NOT EXISTS analyst_user_id   uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS coordinator_name  text,
  ADD COLUMN IF NOT EXISTS observations      text,
  ADD COLUMN IF NOT EXISTS is_incentivado    boolean DEFAULT false;

COMMENT ON COLUMN projects.state_uf         IS 'UF do projeto (ex: BA, SP)';
COMMENT ON COLUMN projects.area_of_action   IS 'Área de atuação (Educação, Saúde, etc.)';
COMMENT ON COLUMN projects.target_audience  IS 'Público-alvo: array de categorias';
COMMENT ON COLUMN projects.start_date       IS 'Data de início do projeto';
COMMENT ON COLUMN projects.end_date         IS 'Data de término do projeto';
COMMENT ON COLUMN projects.total_value      IS 'Valor total do projeto em R$';
COMMENT ON COLUMN projects.people_served    IS 'Quantidade de pessoas atendidas';
COMMENT ON COLUMN projects.analyst_user_id  IS 'Analista do instituto (consultor/investidor)';
COMMENT ON COLUMN projects.coordinator_name IS 'Coordenador/Gerente do projeto';
COMMENT ON COLUMN projects.observations     IS 'Observações gerais';

-- 2. Campos extras no relatório para alinhar com tela 3.1 "Relatórios do Projeto"
-- O PHI mostra: Data Solicitação, Data prev envio PHI-Invest, Data envio Invest,
-- Data aprovação, Número de Revisões, Status, Digitado?
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS requested_at        timestamptz,
  ADD COLUMN IF NOT EXISTS expected_send_date   date,
  ADD COLUMN IF NOT EXISTS sent_to_investor_at  timestamptz,
  ADD COLUMN IF NOT EXISTS revision_count       integer DEFAULT 0;

COMMENT ON COLUMN reports.requested_at        IS 'Data de solicitação do relatório';
COMMENT ON COLUMN reports.expected_send_date  IS 'Data prevista para envio ao investidor';
COMMENT ON COLUMN reports.sent_to_investor_at IS 'Data de envio efetivo ao investidor';
COMMENT ON COLUMN reports.revision_count      IS 'Número de revisões efetuadas';
