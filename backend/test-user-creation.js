/**
 * 测试用户创建和登录功能
 */

import dotenv from 'dotenv'
dotenv.config()

import bcrypt from 'bcryptjs'
import { supabaseAdmin } from './config/database.js'

console.log('🧪 开始测试用户功能...\n')

async function testUserCreation() {
  try {
    const testEmail = 'test@example.com'
    const testPassword = 'test123456'

    console.log('1️⃣ 清理测试用户（如果存在）...')
    await supabaseAdmin
      .from('users')
      .delete()
      .eq('email', testEmail)

    console.log('2️⃣ 创建测试用户...')
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(testPassword, saltRounds)

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: testEmail,
        password_hash: passwordHash,
        name: '测试用户'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ 创建用户失败:', error.message)
      return false
    }

    console.log(`✅ 用户创建成功: ${user.email} (ID: ${user.id})`)

    console.log('3️⃣ 测试密码验证...')
    const isValidPassword = await bcrypt.compare(testPassword, user.password_hash)
    
    if (isValidPassword) {
      console.log('✅ 密码验证成功')
    } else {
      console.log('❌ 密码验证失败')
      return false
    }

    console.log('4️⃣ 验证用户表结构...')
    const expectedFields = ['id', 'email', 'password_hash', 'name', 'created_at']
    const actualFields = Object.keys(user)
    
    const missingFields = expectedFields.filter(field => !actualFields.includes(field))
    if (missingFields.length > 0) {
      console.log('❌ 缺少字段:', missingFields)
      return false
    }

    console.log('✅ 用户表结构验证通过')

    console.log('\n📋 测试用户信息:')
    console.log(`邮箱: ${testEmail}`)
    console.log(`密码: ${testPassword}`)
    console.log(`用户ID: ${user.id}`)
    console.log('\n💡 可以使用这些凭据测试登录功能')

    return true

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message)
    return false
  }
}

// 运行测试
testUserCreation().then(success => {
  if (success) {
    console.log('\n🎉 用户功能测试全部通过!')
  } else {
    console.log('\n⚠️ 测试失败，请检查数据库配置')
  }
}).catch(console.error)