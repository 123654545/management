import axios from 'axios'

async function testRegister() {
  console.log('🧪 测试注册接口...\n')
  
  try {
    const testData = {
      email: 'test@example.com',
      password: 'testpassword123',
      confirmPassword: 'testpassword123'
    }
    
    console.log('📤 发送注册请求...')
    console.log('请求数据:', testData)
    
    const response = await axios.post('http://localhost:5000/auth/register', testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('✅ 注册成功:', response.data)
    
  } catch (error) {
    console.log('❌ 注册失败')
    console.log('错误状态:', error.response?.status)
    console.log('错误消息:', error.response?.data)
    console.log('完整错误:', error.message)
    
    if (error.response?.data) {
      console.log('服务器返回:', JSON.stringify(error.response.data, null, 2))
    }
  }
}

testRegister()