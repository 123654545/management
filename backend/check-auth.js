import jwt from 'jsonwebtoken'
import { supabaseAdmin } from './config/database.js'

// 检查用户数据
async function checkUsers() {
  try {
    console.log('检查用户表...')
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .limit(5)
    
    if (error) {
      console.error('查询用户失败:', error)
    } else {
      console.log('找到用户:', data)
    }
  } catch (err) {
    console.error('检查用户失败:', err)
  }
}

// 生成测试token
function generateTestToken() {
  const payload = {
    userId: 'e5d8373d-30c6-409f-8b7d-02a8fbb9781a', // 使用已知存在的用户ID
    email: 'test@example.com'
  }
  
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key')
  console.log('测试token:', token)
  return token
}

checkUsers()
generateTestToken()