-- Script para limpar dados órfãos e validar exclusões
-- Executar para resolver problema de abas excluídas que ainda aparecem

-- 1. Verificar dados órfãos (rows sem tabs)
SELECT 
    tr.id as row_id,
    tr.tab_id,
    tr.created_at as row_created,
    t.id as tab_exists,
    t.name as tab_name
FROM tab_rows tr
LEFT JOIN tabs t ON tr.tab_id = t.id
WHERE t.id IS NULL;

-- 2. Remover dados órfãos (rows sem tabs correspondentes)
DELETE FROM tab_rows 
WHERE tab_id NOT IN (SELECT id FROM tabs);

-- 3. Verificar se há tabs duplicadas
SELECT name, COUNT(*) as count
FROM tabs 
GROUP BY name 
HAVING COUNT(*) > 1;

-- 4. Verificar tamanho atual do banco
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public';

-- 5. Vacuum para recuperar espaço
VACUUM FULL;

-- 6. Reindexar para otimizar
REINDEX DATABASE;

-- 7. Verificar estatísticas finais
SELECT 
    (SELECT COUNT(*) FROM tabs) as total_tabs,
    (SELECT COUNT(*) FROM tab_rows) as total_rows,
    (SELECT COUNT(*) FROM tab_rows WHERE tab_id NOT IN (SELECT id FROM tabs)) as orphaned_rows;
