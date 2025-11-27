-- 智能合同管理系统 - 数据库初始化脚本
-- 在Supabase控制台的SQL编辑器中执行此脚本

-- ========================================
-- 1. 创建基础表结构
-- ========================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  department TEXT,
  position TEXT,
  is_active BOOLEAN DEFAULT true,
  password_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 合同表
CREATE TABLE IF NOT EXISTS contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  contract_number TEXT UNIQUE,
  parties TEXT NOT NULL,
  amount DECIMAL(15, 2),
  currency TEXT DEFAULT 'CNY',
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  category TEXT,
  description TEXT,
  content TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  file_type VARCHAR(100),
  user_id TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 合同分析表
CREATE TABLE IF NOT EXISTS contract_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('risk', 'summary', 'keywords', 'dates')),
  content JSONB,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  summary TEXT,
  recommendations TEXT,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  analysis_model TEXT DEFAULT 'deepseek',
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 合同模板表
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  file_type VARCHAR(100),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  use_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  rating_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 合同提醒表
CREATE TABLE IF NOT EXISTS contract_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('expiry', 'payment', 'renewal')),
  is_sent BOOLEAN DEFAULT FALSE,
  message TEXT,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. 创建索引（提升查询性能）
-- ========================================

CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at);
CREATE INDEX IF NOT EXISTS idx_contract_analyses_contract_id ON contract_analyses(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_analyses_user_id ON contract_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_uploaded_by ON templates(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_reminders_contract_id ON contract_reminders(contract_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON contract_reminders(user_id);

-- ========================================
-- 3. 创建触发器（自动更新时间戳）
-- ========================================

-- 更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表创建更新时间触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at 
    BEFORE UPDATE ON contracts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contract_analyses_updated_at ON contract_analyses;
CREATE TRIGGER update_contract_analyses_updated_at 
    BEFORE UPDATE ON contract_analyses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 4. 行级安全策略 (RLS)
-- ========================================

-- 启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_reminders ENABLE ROW LEVEL SECURITY;

-- 删除已存在的策略（避免重复创建）
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can insert own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can update own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can delete own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can view own analyses" ON contract_analyses;
DROP POLICY IF EXISTS "Users can insert own analyses" ON contract_analyses;
DROP POLICY IF EXISTS "Users can update own analyses" ON contract_analyses;
DROP POLICY IF EXISTS "Users can delete own analyses" ON contract_analyses;
DROP POLICY IF EXISTS "Anyone can view public templates" ON templates;
DROP POLICY IF EXISTS "Users can view own templates" ON templates;
DROP POLICY IF EXISTS "Users can insert templates" ON templates;
DROP POLICY IF EXISTS "Users can update own templates" ON templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON templates;
DROP POLICY IF EXISTS "Users can view own reminders" ON contract_reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON contract_reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON contract_reminders;
DROP POLICY IF EXISTS "Users can delete own reminders" ON contract_reminders;

-- 用户表策略
CREATE POLICY "Enable insert for all users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 合同表策略
CREATE POLICY "Users can view own contracts" ON contracts
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own contracts" ON contracts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own contracts" ON contracts
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own contracts" ON contracts
  FOR DELETE USING (auth.uid()::text = user_id);

-- 合同分析表策略
CREATE POLICY "Users can view own analyses" ON contract_analyses
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own analyses" ON contract_analyses
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own analyses" ON contract_analyses
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own analyses" ON contract_analyses
  FOR DELETE USING (auth.uid()::text = user_id);

-- 模板表策略（更宽松的访问控制）
CREATE POLICY "Anyone can view public templates" ON templates
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own templates" ON templates
  FOR SELECT USING (uploaded_by = auth.uid());

CREATE POLICY "Users can insert templates" ON templates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own templates" ON templates
  FOR UPDATE USING (uploaded_by = auth.uid());

CREATE POLICY "Users can delete own templates" ON templates
  FOR DELETE USING (uploaded_by = auth.uid());

-- 提醒表策略
CREATE POLICY "Users can view own reminders" ON contract_reminders
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own reminders" ON contract_reminders
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own reminders" ON contract_reminders
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own reminders" ON contract_reminders
  FOR DELETE USING (auth.uid()::text = user_id);

-- ========================================
-- 5. 插入示例数据
-- ========================================

-- 示例用户（仅在表为空时插入）
INSERT INTO users (email, name, department, position) 
SELECT 'admin@example.com', '系统管理员', 'IT', '管理员'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com');

INSERT INTO users (email, name, department, position) 
SELECT 'test@example.com', '测试用户', '法务', '法务专员'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'test@example.com');

-- ========================================
-- 6. 验证创建结果
-- ========================================

-- 显示创建的表
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 显示创建的索引
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;