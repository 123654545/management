import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Supabase 客户端配置
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY

// 管理员客户端（使用服务角色密钥或匿名密钥）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 普通客户端（用于用户认证）
export const supabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 系统客户端（使用服务角色密钥绕过RLS，用于系统操作）
// 确保使用服务角色密钥，而不是匿名密钥
export const supabaseSystem = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/2.0.0',
      // 显式指定使用服务角色密钥
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
    }
  }
})

export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count')
    if (error) {
      console.error('数据库连接失败:', error.message)
      return false
    }
    console.log('✅ 数据库连接成功')
    return true
  } catch (error) {
    console.error('数据库连接异常:', error.message)
    return false
  }
}