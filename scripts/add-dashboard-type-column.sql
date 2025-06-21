-- Adicionar coluna dashboard_type à tabela tabs
ALTER TABLE tabs ADD COLUMN IF NOT EXISTS dashboard_type VARCHAR(50) DEFAULT 'rollout';

-- Atualizar registros existentes baseado no nome da aba
UPDATE tabs SET dashboard_type = 'testing' WHERE name LIKE '%Teste%' OR name LIKE '%Integra%';
UPDATE tabs SET dashboard_type = 'rollout' WHERE dashboard_type IS NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_tabs_dashboard_type ON tabs(dashboard_type);
