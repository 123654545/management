import axios from 'axios'

// 测试API健康检查
async function testAPIHealth() {
  try {
    console.log('测试API健康检查...')
    
    const response = await axios.get('http://localhost:5000/health')
    console.log('✅ 服务器健康检查通过:', response.data)
    
    // 测试DeepSeek健康状态
    try {
      const analysisHealth = await axios.get('http://localhost:5000/analysis/health', {
        headers: {
          'Authorization': 'Bearer test-token' // 临时token用于测试
        }
      })
      console.log('✅ 分析服务健康检查通过:', analysisHealth.data)
    } catch (error) {
      console.log('❌ 分析服务健康检查失败:', error.response?.data || error.message)
    }
    
  } catch (error) {
    console.error('❌ 服务器健康检查失败:', error.message)
  }
}

// 测试DeepSeek API直接调用
async function testDeepSeekAPI() {
  console.log('\n测试DeepSeek API直接调用...')
  
  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: '请简单回复"测试成功"'
        }
      ],
      max_tokens: 10
    }, {
      headers: {
        'Authorization': 'Bearer sk-b45d1d753556452dbc7b412dfc9f7eb5',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })
    
    console.log('✅ DeepSeek API调用成功:', response.data.choices[0].message.content)
    return true
  } catch (error) {
    console.error('❌ DeepSeek API调用失败:', error.response?.data || error.message)
    return false
  }
}

// 测试合同分析功能
async function testContractAnalysis() {
  console.log('\n测试合同分析功能...')
  
  const testContract = `
    甲方：ABC科技有限公司
    乙方：XYZ技术服务公司
    
    合同金额：人民币100,000元
    服务期限：2024年1月1日至2024年12月31日
    
    甲方委托乙方提供技术服务，乙方同意接受委托。
    
    本合同自动续约，除非任何一方在合同到期前30天书面通知对方不续约。
    
    违约责任：违约方需向守约方支付合同总额20%的违约金。
    
    签订日期：2023年12月15日
  `
  
  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一位资深合同法律专家，请分析以下合同并提取关键信息。'
        },
        {
          role: 'user',
          content: `请分析以下合同文本，提取关键信息并以JSON格式返回：
          
          ${testContract}
          
          返回格式：
          {
            "key_terms": [
              {"term": "甲方", "value": "具体公司名称"},
              {"term": "乙方", "value": "具体公司名称"},
              {"term": "合同金额", "value": "具体金额"}
            ],
            "risk_points": [
              {"risk": "风险类型", "description": "风险描述", "level": "high/medium/low"}
            ]
          }`
        }
      ],
      temperature: 0.1,
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': 'Bearer sk-b45d1d753556452dbc7b412dfc9f7eb5',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })
    
    const result = response.data.choices[0].message.content
    console.log('✅ 合同分析成功:', result)
    
    // 尝试解析JSON
    try {
      const parsed = JSON.parse(result)
      console.log('✅ JSON解析成功')
      console.log('📋 提取的关键条款:', parsed.key_terms)
      console.log('⚠️ 识别的风险点:', parsed.risk_points)
    } catch (parseError) {
      console.log('❌ JSON解析失败:', parseError.message)
    }
    
    return true
  } catch (error) {
    console.error('❌ 合同分析失败:', error.response?.data || error.message)
    return false
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始API集成测试...\n')
  
  await testAPIHealth()
  
  const deepseekWorks = await testDeepSeekAPI()
  
  if (deepseekWorks) {
    await testContractAnalysis()
  }
  
  console.log('\n✨ 测试完成！')
}

// 运行测试
runAllTests().catch(console.error)