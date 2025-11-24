# Supabase 配置指南

## 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com)
2. 点击 "Start your project"
3. 使用 GitHub 账号登录
4. 点击 "New Project"
5. 选择组织，输入项目名称
6. 设置数据库密码（请妥善保存）
7. 选择地区（建议选择离您最近的地区）
8. 点击 "Create new project"

## 2. 获取项目配置

项目创建完成后，在项目设置中获取以下信息：

1. 进入 Project Settings > API
2. 复制以下信息：
   - Project URL
   - anon public key（公开密钥）

## 3. 配置项目环境变量

1. 复制 `.env.example` 文件为 `.env`：
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，填入您的 Supabase 配置：
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

## 4. 安装依赖

```bash
npm install
```

## 5. 数据库表结构示例

以下是为合同管理系统创建的示例 SQL 表：

```sql
-- 用户表（如果使用 Supabase Auth，则不需要创建）
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 合同表
CREATE TABLE contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  contract_number TEXT UNIQUE,
  parties TEXT NOT NULL,
  amount DECIMAL(15, 2),
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'draft',
  file_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 合同提醒表
CREATE TABLE contract_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  reminder_type TEXT NOT NULL, -- 'expiry', 'payment', 'renewal'
  is_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 6. 配置 Row Level Security (RLS)

启用行级安全性：

```sql
-- 启用 RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_reminders ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的合同
CREATE POLICY "Users can view their own contracts" ON contracts
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own contracts" ON contracts
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own contracts" ON contracts
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own contracts" ON contracts
  FOR DELETE USING (created_by = auth.uid());
```

## 7. 更新现有代码使用 Supabase

现在您可以在组件中使用 Supabase：

```javascript
import { supabase } from '@/config/supabase'
import supabaseService from '@/services/supabaseService'

// 在组件中使用
export default {
  methods: {
    async loadContracts() {
      const { data, error } = await supabaseService.select('contracts', {
        eq: { created_by: this.currentUser.id }
      })
      
      if (error) {
        console.error('加载合同失败:', error)
        return
      }
      
      this.contracts = data
    }
  }
}
```

## 8. 部署注意事项

- 确保在生产环境中正确配置环境变量
- 定期备份 Supabase 数据库
- 监控 API 使用量和费用

## 9. 故障排除

### 常见问题

1. **连接错误**: 检查 `.env` 文件中的 URL 和密钥是否正确
2. **权限错误**: 确保 RLS 策略正确配置
3. **CORS 错误**: 在 Supabase 项目设置中配置正确的 CORS 域名

### 调试工具

使用浏览器开发者工具查看网络请求，检查：
- 请求 URL 是否正确
- 请求头中是否包含正确的认证信息
- 响应内容中的错误信息

## 10. 相关资源

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase JavaScript 客户端文档](https://supabase.com/docs/reference/javascript)
- [Supabase 身份认证指南](https://supabase.com/docs/guides/auth)