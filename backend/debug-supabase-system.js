import { supabaseSystem, supabase } from './config/database.js'

async function debugSupabaseSystem() {
  console.log('开始调试Supabase System客户端...')
  
  try {
    // 测试直接使用supabaseSystem查询
    console.log('\n1. 测试supabaseSystem直接查询（不使用where条件）:')
    const { data: systemData, error: systemError } = await supabaseSystem
      .from('contracts')
      .select('id, user_id, title')
      .limit(5)
    
    console.log('system查询结果:', systemData || '无数据')
    console.log('system查询错误:', systemError || '无错误')
    
    // 测试普通supabase查询
    console.log('\n2. 测试普通supabase查询:')
    const { data: regularData, error: regularError } = await supabase
      .from('contracts')
      .select('id, user_id, title')
      .limit(5)
    
    console.log('regular查询结果:', regularData || '无数据')
    console.log('regular查询错误:', regularError || '无错误')
    
    // 检查环境变量
    console.log('\n3. 环境变量检查:')
    console.log('SUPABASE_URL设置:', process.env.SUPABASE_URL ? '已设置' : '未设置')
    console.log('SUPABASE_SERVICE_KEY设置:', process.env.SUPABASE_SERVICE_KEY ? '已设置' : '未设置')
    
    // 尝试查询具体合同
    if (systemData && systemData.length > 0) {
      const testContractId = systemData[0].id
      console.log(`\n4. 测试查询特定合同ID: ${testContractId}`)
      
      const { data: specificContract, error: specificError } = await supabaseSystem
        .from('contracts')
        .select('*')
        .eq('id', testContractId)
        .single()
      
      console.log('特定合同查询结果:', specificContract || '无数据')
      console.log('特定合同查询错误:', specificError || '无错误')
      
      // 测试查询分析数据
      console.log('\n5. 测试查询分析数据:')
      const { data: analysisData, error: analysisError } = await supabaseSystem
        .from('contract_analyses')
        .select('*')
        .eq('contract_id', testContractId)
        .single()
      
      console.log('分析数据查询结果:', analysisData || '无数据')
      console.log('分析数据查询错误:', analysisError || '无错误')
    }
    
  } catch (error) {
    console.error('调试过程中发生错误:', error)
  }
}

debugSupabaseSystem().catch(console.error)
