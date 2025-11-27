import axios from 'axios'

async function testDirectRegister() {
  console.log('🧪 直接测试注册接口...\n')
  
  try {
    // 1. 测试直接API调用
    console.log('1️⃣ 测试 http://localhost:5000/auth/register')
    
    const testData = {
      email: `direct-test-${Date.now()}@example.com`,
      password: 'password123',
      confirmPassword: 'password123'
    }
    
    const response1 = await axios.post('http://localhost:5000/auth/register', testData, {
      headers: { 'Content-Type': 'application/json' }
    })
    
    console.log('✅ 直接调用成功:', response1.data)
    
  } catch (error1) {
    console.log('❌ 直接调用失败:')
    console.log('  状态:', error1.response?.status)
    console.log('  消息:', error1.response?.data?.message)
    console.log('  详情:', error1.response?.data)
  }
  
  try {
    // 2. 测试通过代理的API调用
    console.log('\n2️⃣ 测试 http://localhost:3000/api/auth/register')
    
    const testData2 = {
      email: `proxy-test-${Date.now()}@example.com`,
      password: 'password123',
      confirmPassword: 'password123'
    }
    
    const response2 = await axios.post('http://localhost:3000/api/auth/register', testData2, {
      headers: { 'Content-Type': 'application/json' }
    })
    
    console.log('✅ 代理调用成功:', response2.data)
    
  } catch (error2) {
    console.log('❌ 代理调用失败:')
    console.log('  状态:', error2.response?.status)
    console.log('  消息:', error2.response?.data?.message)
    console.log('  详情:', error2.response?.data)
  }
  
  console.log('\n🎯 测试完成')
}

testDirectRegister()