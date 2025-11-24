# 智能合同管理系统

基于 Vue 3 + TypeScript + Element Plus 的智能合同分析管理系统，支持合同上传、AI 智能分析、风险识别和日历导出功能。

## 功能特性

- 🔐 **用户认证** - 注册/登录，JWT 令牌认证
- 📄 **合同管理** - 支持 PDF/Word 文件上传和管理
- 🤖 **AI 智能分析** - 自动提取关键条款、识别风险点、提取关键日期
- 📊 **可视化展示** - 结构化显示分析结果
- 📅 **日历导出** - 支持关键日期导出到日历应用
- 📱 **响应式设计** - 适配桌面端和平板端

## 技术栈

### 前端
- **框架**: Vue 3 + Composition API
- **构建工具**: Vite
- **UI 组件库**: Element Plus
- **路由**: Vue Router 4
- **状态管理**: Pinia
- **HTTP 客户端**: Axios
- **日历导出**: ics.js

### 后端（需另外实现）
- **框架**: Express.js
- **数据库**: Supabase PostgreSQL
- **ORM**: Prisma
- **认证**: JWT + bcrypt
- **文件处理**: multer + pdf-parse + mammoth
- **AI 集成**: OpenAI GPT-4 / Google Gemini

## 项目结构

```
src/
├── api/                    # API 接口
│   ├── auth.ts            # 认证相关接口
│   ├── contract.ts        # 合同相关接口
│   └── request.ts         # HTTP 请求配置
├── assets/                # 静态资源
├── components/            # 通用组件
│   └── UploadDialog.vue   # 上传对话框组件
├── composables/           # 组合式函数
│   ├── useCopy.ts         # 复制功能
│   └── useUpload.ts       # 上传功能
├── router/                # 路由配置
│   └── index.ts
├── stores/                # Pinia 状态管理
│   ├── contract.ts        # 合同状态
│   └── user.ts            # 用户状态
├── types/                 # TypeScript 类型定义
│   ├── common.ts          # 通用类型
│   ├── contract.ts        # 合同类型
│   └── user.ts            # 用户类型
├── utils/                 # 工具函数
│   ├── calendar.ts        # 日历相关工具
│   ├── date.ts            # 日期工具
│   ├── file.ts            # 文件工具
│   └── validation.ts      # 验证工具
├── views/                 # 页面组件
│   ├── auth/              # 认证页面
│   │   ├── Login.vue      # 登录页
│   │   └── Register.vue   # 注册页
│   ├── contract/          # 合同页面
│   │   ├── ContractDetail.vue  # 合同详情页
│   │   └── Dashboard.vue  # 合同列表页
│   ├── error/             # 错误页面
│   │   └── NotFound.vue   # 404 页面
│   └── user/              # 用户页面
│       └── Profile.vue    # 个人资料页
├── App.vue                # 根组件
└── main.ts                # 应用入口
```

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0 或 yarn >= 1.22.0

### 安装依赖

```bash
npm install
```

### 开发环境启动

```bash
npm run dev
```

### 生产环境构建

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

### 代码检查和格式化

```bash
npm run lint
```

## 环境配置

项目需要配置后端 API 地址，在 `vite.config.ts` 中修改代理配置：

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',  // 后端服务地址
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

## 核心功能说明

### 1. 用户认证
- 用户注册/登录
- JWT 令牌认证
- 路由守卫保护

### 2. 合同管理
- 支持 PDF 和 Word 文件上传
- 文件大小限制（20MB）
- 合同列表展示
- 标题编辑和删除功能

### 3. AI 智能分析
- 自动文本提取
- 关键条款结构化提取
- 风险点识别和分级
- 关键日期提取

### 4. 结果展示
- 合同文本预览
- 关键信息表格展示
- 风险提示卡片
- 关键日期管理

### 5. 日历导出
- 单个日期导出
- 批量日期导出
- ICS 格式支持

## API 接口说明

### 认证接口
- `POST /auth/login` - 用户登录
- `POST /auth/register` - 用户注册
- `GET /auth/me` - 获取用户信息
- `PUT /auth/profile` - 更新用户资料
- `POST /auth/change-password` - 修改密码

### 合同接口
- `GET /contracts` - 获取合同列表
- `POST /contracts/upload` - 上传合同
- `GET /contracts/:id` - 获取合同详情
- `PUT /contracts/:id` - 更新合同
- `DELETE /contracts/:id` - 删除合同
- `GET /contracts/:id/analysis` - 获取分析结果
- `POST /contracts/:id/analyze` - 分析合同
- `GET /contracts/:id/download` - 下载文件

## 开发说明

### 代码规范
- 遵循 Vue 3 Composition API 最佳实践
- 使用 ESLint 和 Prettier 进行代码格式化

### 状态管理
- 使用 Pinia 进行状态管理
- 模块化设计，按功能拆分 store

### 组件设计
- 统一的组件命名规范
- 组件复用性优先
- Props 和 Emit 类型定义

## 部署说明

### 前端部署
推荐部署到 Vercel、Netlify 或其他静态托管服务：

```bash
npm run build
# 将 dist 目录部署到静态托管服务
```

### 环境变量
根据部署环境设置相应的 API 地址和其他配置。

## 注意事项

1. 本项目为前端部分，需要配合后端服务使用
2. AI 分析功能需要配置相应的 API 密钥
3. 文件上传需要后端支持文件存储
4. 数据库配置需要在后端完成

## 许可证

MIT License