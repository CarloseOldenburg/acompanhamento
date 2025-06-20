-- Limpar dados órfãos e inconsistentes
DELETE FROM tab_rows WHERE tab_id NOT IN (SELECT id FROM tabs);

-- Recriar índices para melhor performance
DROP INDEX IF EXISTS idx_tab_rows_tab_id;
DROP INDEX IF EXISTS idx_tabs_created_at;

CREATE INDEX idx_tab_rows_tab_id ON tab_rows(tab_id);
CREATE INDEX idx_tabs_created_at ON tabs(created_at);
CREATE INDEX idx_tab_rows_created_at ON tab_rows(created_at);

-- Verificar integridade dos dados
SELECT 
  t.id as tab_id,
  t.name as tab_name,
  COUNT(tr.id) as row_count,
  t.created_at
FROM tabs t
LEFT JOIN tab_rows tr ON t.id = tr.tab_id
GROUP BY t.id, t.name, t.created_at
ORDER BY t.created_at DESC;
