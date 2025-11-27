/**
 * 后端健康检查工具
 * 检查数据库连接、环境变量和必要文件
 */

import { testConnection } from './config/database.js'
import fs from 'fs'
import path from 'path'

console.log('🔍 开始后端健康检查...\n')

// 检查环境变量
console.log('📋 检查环境变量:')
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY', 
  'JWT_SECRET'
]

let envOk = true
requiredEnvVars.forEach(varName => {
  const value = process.env[varName]
  if (!value || value.includes('your_') || value.includes('YOUR_')) {
    console.log(`❌ ${varName}: 未配置或使用默认值`)
    envOk = false
  } else {
    console.log(`✅ ${varName}: 已配置`)
  }
})

if (!envOk) {
  console.log('\n⚠️  请检查 .env 文件中的环境变量配置')
}

// 检查必要文件
console.log('\n📁 检查必要文件:')
const requiredFiles = [
  'middleware/errorHandler.js',
  'middleware/auth.js',
  'routes/auth.js',
  'routes/contracts.js',
  'routes/analysis.js',
  'config/database.js',
  'utils/fileUpload.js',
  'utils/textExtraction.js'
]

let filesOk = true
requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`❌ ${file}: 文件不存在`)
    filesOk = false
  }
})

// 检查目录
console.log('\n📂 检查目录:')
const requiredDirs = [
  'uploads',
  'middleware',
  'routes',
  'config',
  'utils'
]

requiredDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir)
  if (fs.existsSync(dirPath)) {
    console.log(`✅ ${dir}/`)
  } else {
    console.log(`❌ ${dir}/: 目录不存在`)
    fs.mkdirSync(dirPath, { recursive: true })
    console.log(`✅ 已创建 ${dir}/ 目录`)
  }
})

// 检查数据库连接
console.log('\n🗄️  检查数据库连接:')
testConnection().then(connected => {
  if (connected) {
    console.log('✅ 数据库连接正常')
  } else {
    console.log('❌ 数据库连接失败')
  }
  
  // 总结
  console.log('\n📊 健康检查总结:')
  console.log(`环境变量: ${envOk ? '✅ 正常' : '❌ 需要修复'}`)
  console.log(`必要文件: ${filesOk ? '✅ 正常' : '❌ 需要修复'}`)
  console.log(`数据库: ${connected ? '✅ 连接正常' : '❌ 连接失败'}`)
  
  if (envOk && filesOk && connected) {
    console.log('\n🎉 后端配置检查通过，可以启动服务!')
  } else {
    console.log('\n⚠️  发现问题，请根据上述提示修复后再启动服务')
  }
}).catch(error => {
  console.log('❌ 数据库检查异常:', error.message)
})