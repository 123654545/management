// 测试JSON清理功能
function cleanJSONResponse(response) {
  // 移除markdown标记
  let cleaned = response
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim()
  
  // 修复常见的JSON格式问题
  cleaned = cleaned
    .replace(/(\w+):/g, '"$1":') // 添加引号到键名
    .replace(/:\s*([^",\[\]\{\}]+)/g, ': "$1"') // 添加引号到值
    .replace(/,\s*}/g, '}') // 移除尾部逗号
    .replace(/,\s*\]/g, ']') // 移除尾部逗号
  
  return cleaned
}

// 测试JSON清理
const testResponse = `\`\`\`json
{
  "key_terms": [
    {"term": "甲方", "value": "ABC科技有限公司"},
    {"term": "乙方", "value": "XYZ技术服务公司"},
    {"term": "合同金额", "value": "人民币100000元"}
  ],
  "risk_points": [
    {"risk": "自动续约条款", "description": "合同约定自动续约", "level": "medium"}
  ]
}
\`\`\``

console.log('原始响应:', testResponse)
console.log('清理后的响应:', cleanJSONResponse(testResponse))

try {
  const parsed = JSON.parse(cleanJSONResponse(testResponse))
  console.log('✅ JSON解析成功!')
  console.log('提取的关键条款:', parsed.key_terms)
  console.log('识别的风险点:', parsed.risk_points)
} catch (error) {
  console.error('❌ JSON解析失败:', error.message)
}