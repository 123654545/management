import dotenv from 'dotenv'
dotenv.config()

console.log('🔍 调试数据库连接...\n')
console.log('SUPABASE_URL:', process.env.SUPABASE_URL)
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY?.substring(0, 20) + '...')
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY?.substring(0, 20) + '...')

import { createClient } from '@supabase/supabase-js'

// 测试匿名客户端
console.log('\n1️⃣ 测试匿名客户端...')
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

try {
  const { data, error } = await supabaseAnon.from('users').select('count').limit(1)
  console.log('匿名客户端结果:', { data, error: error?.message })
} catch (err) {
  console.log('匿名客户端错误:', err.message)
}

// 测试服务角色客户端
console.log('\n2️⃣ 测试服务角色客户端...')
const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

try {
  const { data, error } = await supabaseService.from('users').select('count').limit(1)
  console.log('服务角色客户端结果:', { data, error: error?.message })
} catch (err) {
  console.log('服务角色客户端错误:', err.message)
}

// 测试创建客户端（按照当前配置）
console.log('\n3️⃣ 测试当前配置...')
try {
  const { supabaseAdmin } = await import('./config/database.js')
  const { data, error } = await supabaseAdmin.from('users').select('count').limit(1)
  console.log('当前配置结果:', { data, error: error?.message })
} catch (err) {
  console.log('当前配置错误:', err.message)
}