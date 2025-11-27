-- 修复用户表的RLS策略，允许新用户注册
-- 在Supabase控制台执行此SQL

-- 1. 删除现有的用户表RLS策略
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for all users" ON users;

-- 2. 创建允许用户注册的策略
-- 允许任何认证用户注册新账户
CREATE POLICY "Enable insert for all users" ON users
  FOR INSERT WITH CHECK (true);

-- 3. 创建允许用户查看自己的信息的策略
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- 4. 创建允许用户更新自己信息的策略
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 5. 允许服务密钥绕过RLS（用于管理员操作）
CREATE POLICY "Service key bypass RLS for users" ON users
  FOR ALL USING (
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- 验证策略创建
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';