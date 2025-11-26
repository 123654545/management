import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

import authRoutes from './routes/auth.js'
import contractRoutes from './routes/contracts.js'
import analysisRoutes from './routes/analysis.js'
import templateRoutes from './routes/templates.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

// 配置环境变量
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

// 安全中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 限制每个IP 15分钟内最多100个请求
})
app.use(limiter)

// CORS 配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}))

// 解析请求体
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// 静态文件服务（用于文件上传）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// API 路由
app.use('/auth', authRoutes)
app.use('/contracts', contractRoutes)
app.use('/analysis', analysisRoutes)
app.use('/templates', templateRoutes)

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  })
})

// 全局错误处理（使用新的错误处理器）
app.use(errorHandler)

// 404 处理
app.use(notFoundHandler)

// 启动服务器
app.listen(PORT, () => {
  console.log(`
🚀 服务器启动成功！
📍 端口: ${PORT}
🌍 环境: ${process.env.NODE_ENV}
🕒 时间: ${new Date().toLocaleString('zh-CN')}
  `)
})