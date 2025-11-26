-- 创建合同模板表
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
    uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE,
    use_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_uploaded_by ON templates(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at);
CREATE INDEX IF NOT EXISTS idx_templates_use_count ON templates(use_count);
CREATE INDEX IF NOT EXISTS idx_templates_rating ON templates(rating);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 启用RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- 用户可以查看所有模板
CREATE POLICY "Users can view all templates" ON templates
    FOR SELECT USING (true);

-- 只有上传者可以修改自己的模板
CREATE POLICY "Users can update own templates" ON templates
    FOR UPDATE USING (auth.uid() = uploaded_by);

-- 只有上传者可以删除自己的模板
CREATE POLICY "Users can delete own templates" ON templates
    FOR DELETE USING (auth.uid() = uploaded_by);

-- 任何认证用户都可以上传模板
CREATE POLICY "Users can insert templates" ON templates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');