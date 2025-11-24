import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Supabase 客户端配置
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY

// 管理员客户端（绕过RLS）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey,
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json; charset=utf-8'
    }
  }
})

// 普通客户端（用于用户认证）
export const supabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
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