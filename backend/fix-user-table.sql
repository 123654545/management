-- 修复users表结构，添加password_hash字段
-- 在Supabase控制台执行此SQL

-- 检查并添加password_hash字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
          AND column_name = 'password_hash'
          AND table_schema = 'public'
    ) THEN
        ALTER TABLE users ADD COLUMN password_hash TEXT;
        RAISE NOTICE '✅ 添加了password_hash列到users表';
    ELSE
        RAISE NOTICE '✅ password_hash列已存在';
    END IF;
END $$;

-- 验证表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;