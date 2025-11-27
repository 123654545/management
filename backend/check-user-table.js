import { supabaseAdmin } from './config/database.js'
import dotenv from 'dotenv'

dotenv.config()

async function checkUserTable() {
  console.log('🔍 检查users表结构...\n')
  
  try {
    // 尝试获取用户信息来检查表结构
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('❌ 检查users表失败:', error.message)
      
      // 查看具体的列信息
      const { data: columns, error: columnError } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'users')
        .eq('table_schema', 'public')
        .order('ordinal_position')
      
      if (columnError) {
        console.log('❌ 无法获取列信息:', columnError.message)
      } else {
        console.log('📋 users表的列:')
        columns.forEach(col => {
          console.log(`  - ${col.column_name} (${col.data_type})`)
        })
      }
    } else {
      console.log('✅ users表访问正常')
      if (data && data.length > 0) {
        console.log('📋 现有列:', Object.keys(data[0]).join(', '))
      }
    }
    
  } catch (err) {
    console.log('❌ 检查过程中出错:', err.message)
  }
}

checkUserTable()