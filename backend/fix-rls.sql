-- 修复用户表的 RLS 策略
-- 允许匿名用户注册（创建用户）

-- 1. 禁用用户表的 RLS（临时解决方案）
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. 允许任何人插入用户（注册功能）
DROP POLICY IF EXISTS "Enable insert for anonymous" ON users;
CREATE POLICY "Enable insert for anonymous" ON users
  FOR INSERT WITH CHECK (true);

-- 3. 允许用户查看自己的信息
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- 4. 允许用户更新自己的信息
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- 5. 重新启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 6. 给匿名用户授予表权限
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT ON users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;

-- 验证策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users';