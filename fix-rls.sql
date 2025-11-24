-- 修复Supabase行级安全策略

-- 1. 为contracts表设置RLS策略
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- 2. 删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can view own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can insert own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can update own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can delete own contracts" ON contracts;

-- 3. 创建新的RLS策略
-- 允许用户查看自己的合同
CREATE POLICY "Users can view own contracts" ON contracts
  FOR SELECT USING (auth.uid()::text = user_id);

-- 允许用户插入自己的合同
CREATE POLICY "Users can insert own contracts" ON contracts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 允许用户更新自己的合同
CREATE POLICY "Users can update own contracts" ON contracts
  FOR UPDATE USING (auth.uid()::text = user_id);

-- 允许用户删除自己的合同
CREATE POLICY "Users can delete own contracts" ON contracts
  FOR DELETE USING (auth.uid()::text = user_id);

-- 4. 为contract_analyses表设置RLS策略
ALTER TABLE contract_analyses ENABLE ROW LEVEL SECURITY;

-- 5. 删除旧的analysis策略
DROP POLICY IF EXISTS "Users can view own analyses" ON contract_analyses;
DROP POLICY IF EXISTS "Users can insert own analyses" ON contract_analyses;
DROP POLICY IF EXISTS "Users can update own analyses" ON contract_analyses;

-- 6. 创建新的analysis策略
-- 允许查看通过contract_id关联的分析记录
CREATE POLICY "Users can view own analyses" ON contract_analyses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_analyses.contract_id 
      AND contracts.user_id = auth.uid()::text
    )
  );

-- 允许插入分析记录（如果用户拥有对应合同）
CREATE POLICY "Users can insert own analyses" ON contract_analyses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_analyses.contract_id 
      AND contracts.user_id = auth.uid()::text
    )
  );

-- 允许更新分析记录（如果用户拥有对应合同）
CREATE POLICY "Users can update own analyses" ON contract_analyses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_analyses.contract_id 
      AND contracts.user_id = auth.uid()::text
    )
  );

-- 7. 为服务密钥创建绕过RLS的策略
-- 这样后端使用service key时不受限制
CREATE POLICY "Service key bypass RLS" ON contracts
  FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role');

CREATE POLICY "Service key bypass RLS for analyses" ON contract_analyses
  FOR ALL USING (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role');

-- 8. 确保service_role角色存在
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END
$$;