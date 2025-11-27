-- 添加password_hash字段到users表
-- 在Supabase控制台执行此SQL

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 验证字段添加成功
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND column_name = 'password_hash';