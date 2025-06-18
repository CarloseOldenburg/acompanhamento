-- Criar tabelas para o sistema de acompanhamento
CREATE TABLE IF NOT EXISTS tabs (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    columns JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tab_rows (
    id VARCHAR(255) PRIMARY KEY,
    tab_id VARCHAR(255) REFERENCES tabs(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tab_rows_tab_id ON tab_rows(tab_id);
CREATE INDEX IF NOT EXISTS idx_tabs_name ON tabs(name);

-- Inserir dados iniciais
INSERT INTO tabs (id, name, columns) VALUES 
(
    'testes-integracao',
    'Testes de Integração',
    '[
        {"key": "restaurante", "label": "Nome do Restaurante", "type": "text", "width": 200},
        {"key": "telefone", "label": "Telefone do Cliente", "type": "text", "width": 150},
        {"key": "solicitante", "label": "Solicitante", "type": "text", "width": 150},
        {"key": "merchantId", "label": "Merchant ID Totem", "type": "text", "width": 180},
        {"key": "integradora", "label": "PDV / Integradora", "type": "text", "width": 150},
        {"key": "observacao", "label": "Observação", "type": "text", "width": 300},
        {"key": "status", "label": "Status", "type": "select", "options": ["Pendente", "Concluído", "Agendado"], "width": 120},
        {"key": "dataAgendamento", "label": "Data de Agendamento", "type": "datetime", "width": 180}
    ]'
),
(
    'bobs',
    'Bobs',
    '[
        {"key": "loja", "label": "Loja", "type": "text", "width": 200},
        {"key": "responsavel", "label": "Responsável", "type": "text", "width": 150},
        {"key": "versaoAtual", "label": "Versão Atual", "type": "text", "width": 120},
        {"key": "versaoDestino", "label": "Versão Destino", "type": "text", "width": 120},
        {"key": "tipoMudanca", "label": "Tipo de Mudança", "type": "select", "options": ["Rollout", "Hotfix", "Migração"], "width": 150},
        {"key": "observacao", "label": "Observação", "type": "text", "width": 300},
        {"key": "status", "label": "Status", "type": "select", "options": ["Pendente", "Em Andamento", "Concluído", "Cancelado"], "width": 120}
    ]'
),
(
    'mania-churrasco',
    'Mania de Churrasco',
    '[
        {"key": "unidade", "label": "Unidade", "type": "text", "width": 200},
        {"key": "cliente", "label": "Cliente", "type": "text", "width": 150},
        {"key": "tipoAtivacao", "label": "Tipo de Ativação", "type": "select", "options": ["Novo Cliente", "Reativação", "Upgrade"], "width": 150},
        {"key": "plano", "label": "Plano", "type": "text", "width": 120},
        {"key": "observacao", "label": "Observação", "type": "text", "width": 300},
        {"key": "status", "label": "Status", "type": "select", "options": ["Pendente", "Ativo", "Inativo"], "width": 120},
        {"key": "dataAtivacao", "label": "Data de Ativação", "type": "date", "width": 150}
    ]'
)
ON CONFLICT (id) DO NOTHING;
