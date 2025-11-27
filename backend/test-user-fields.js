import { supabaseAdmin } from './config/database.js'

async function testUserFields() {
  console.log('🔍 测试users表字段...\n')
  
  try {
    // 1. 尝试插入一个测试用户
    console.log('1️⃣ 尝试插入测试用户...')
    
    const testUser = {
      email: 'test123@example.com',
      password_hash: 'hashed_password_test',
      name: '测试用户'
    }
    
    console.log('尝试插入:', testUser)
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert(testUser)
      .select()
      .single()
    
    if (error) {
      console.log('❌ 插入失败:')
      console.log('错误代码:', error.code)
      console.log('错误详情:', error.details)
      console.log('错误消息:', error.message)
      
      // 检查表结构
      console.log('\n2️⃣ 检查表结构...')
      const { data: columns, error: colError } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'users')
        .eq('table_schema', 'public')
        .order('ordinal_position')
      
      if (colError) {
        console.log('❌ 无法获取列信息:', colError.message)
      } else {
        console.log('📋 users表的列:')
        columns.forEach(col => {
          console.log(`  - ${col.column_name} (${col.data_type})`)
        })
      }
      
    } else {
      console.log('✅ 插入成功:', data)
      
      // 清理测试数据
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', data.id)
    }
    
  } catch (err) {
    console.log('❌ 测试异常:', err.message)
  }
}

testUserFields()