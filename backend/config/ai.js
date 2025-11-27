import axios from 'axios'
import dotenv from 'dotenv'
import http from 'http'
import https from 'https'
import { deepseekCircuitBreaker, deepseekRetryHandler, healthMonitor } from '../middleware/circuitBreaker.js'
import { ExternalServiceError } from '../middleware/errorHandler.js'

// 加载环境变量
dotenv.config()

/**
 * DeepSeek API 集成类
 * 提供智能合同分析功能
 */
export class DeepSeekAPI {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY
    this.baseURL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1'
    
    if (!this.apiKey) {
      console.warn('DeepSeek API Key 未配置，将使用模拟分析')
      this.isEnabled = false
      return
    }

    this.isEnabled = true
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000, // 优化为15秒超时，避免长时间等待
      maxContentLength: 50 * 1024 * 1024, // 50MB最大响应
      maxBodyLength: 50 * 1024 * 1024, // 50MB最大请求
      // 性能优化配置
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true })
    })

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        console.log('DeepSeek API 请求:', config.method?.toUpperCase(), config.url)
        return config
      },
      (error) => {
        console.error('DeepSeek API 请求错误:', error)
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        return response
      },
      (error) => {
        console.error('DeepSeek API 响应错误:', error.response?.data || error.message)
        return Promise.reject(error)
      }
    )
  }

  /**
   * 检查API是否可用
   */
  async checkHealth() {
    if (!this.isEnabled) return false
    
    const healthCheck = async () => {
      const response = await this.client.post('/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: '测试连接'
          }
        ],
        max_tokens: 10
      })
      return response.status === 200
    }

    try {
      // 使用熔断器和重试机制
      const result = await deepseekCircuitBreaker.call(() =>
        deepseekRetryHandler.call(healthCheck, { operation: 'health_check' })
      )
      return result
    } catch (error) {
      console.error('DeepSeek API 健康检查失败:', error.message)
      return false
    }
  }

  /**
   * 分析合同文本
   */
  async analyzeContract(text, contractTitle = '') {
    if (!this.isEnabled) {
      throw new ExternalServiceError('DeepSeek', 'API未启用')
    }

    // 文本长度检查
    if (text.length > 100000) {
      throw new Error('合同文本过长，超过API限制')
    }

    const analysisFunction = async () => {
      const prompt = this.buildAnalysisPrompt(text, contractTitle)
      
      const response = await this.client.post('/chat/completions', {
        model: 'deepseek-coder', // 使用更轻量的代码模型，分析速度更快
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000, // 减少token数量，加快响应
        frequency_penalty: 0,
        presence_penalty: 0,
        // 启用JSON格式输出，避免后续清理工作
        response_format: {
          type: "json_object"
        }
      })

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new ExternalServiceError('DeepSeek', 'API响应格式错误')
      }

      const result = response.data.choices[0].message.content
      return this.parseAIResponse(result)
    }

    try {
      // 使用熔断器和重试机制执行分析
      const result = await deepseekCircuitBreaker.call(() =>
        deepseekRetryHandler.call(analysisFunction, { 
          operation: 'contract_analysis',
          textLength: text.length,
          title: contractTitle 
        })
      )
      
      // 验证结果格式
      if (!result || !result.data) {
        throw new ExternalServiceError('DeepSeek', '分析结果格式无效')
      }
      
      return result
    } catch (error) {
      console.error('DeepSeek API 分析失败:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        operation: 'contract_analysis',
        title: contractTitle.substring(0, 50) + '...'
      })
      
      // 转换为ExternalServiceError并添加更详细的错误信息
      if (!(error instanceof ExternalServiceError)) {
        const handledError = this.handleAPIError(error)
        throw new ExternalServiceError('DeepSeek', handledError.message, {
          originalError: error,
          errorCode: error.code,
          httpStatus: error.response?.status
        })
      }
      
      throw error
    }
  }

  /**
   * 构建分析提示词
   */
  buildAnalysisPrompt(text, title) {
    return `
请对以下${title ? `《${title}》` : '合同'}进行全面的专业分析：

合同文本：
${text}

请严格按照以下JSON格式返回分析结果：

{
  "key_terms": [
    {
      "term": "合同当事人类型",
      "value": "具体公司名称或个人",
      "confidence": 0.95
    },
    {
      "term": "合同金额",
      "value": "具体金额及币种",
      "confidence": 0.90
    },
    {
      "term": "合同期限",
      "value": "开始日期至结束日期或服务期限",
      "confidence": 0.85
    },
    {
      "term": "服务内容",
      "value": "主要服务或商品描述",
      "confidence": 0.80
    }
  ],
  "risk_points": [
    {
      "risk": "风险类型名称",
      "description": "详细风险描述和法律影响",
      "level": "high",
      "suggestion": "风险规避建议",
      "confidence": 0.90,
      "related_clause": "相关合同条款"
    }
  ],
  "key_dates": [
    {
      "date_type": "日期类型（如：签订日期、生效日期、到期日期、付款日期等）",
      "date_value": "YYYY-MM-DD格式",
      "description": "日期说明",
      "importance": "high"
    }
  ],
  "summary": {
    "contract_type": "合同类型（如：服务合同、采购合同、租赁合同等）",
    "main_obligations": "主要义务概述",
    "special_terms": "特殊条款说明",
    "compliance_notes": "合规注意事项"
  }
}

分析要求：
1. 仔细识别所有合同当事人信息
2. 准确提取金额信息（包括币种、数字转换）
3. 识别所有日期并分类
4. 基于中国法律体系识别风险点
5. 提供可操作的建议
6. 确保JSON格式正确，不要添加注释
7. confidence字段表示置信度（0-1之间的数值）
`
  }

  /**
   * 系统提示词
   */
  getSystemPrompt() {
    return `你是一位资深的合同法律专家，具有以下专业能力：

1. 精通中国合同法、民法典等相关法律法规
2. 拥有10年以上的合同审核经验
3. 熟悉各类商业合同的标准条款和风险点
4. 具备敏锐的风险识别能力和法律风险预判能力
5. 擅长将复杂的法律条款转化为通俗易懂的分析

分析原则：
- 严格遵循客观性，不做主观臆断
- 重点关注违约责任、付款条款、保密条款等关键内容
- 识别模糊表述、不对等条款、潜在风险
- 提供实用的风险规避建议
- 对不确定的信息标注合适的置信度

请以专业、严谨的态度进行合同分析。`
  }

  /**
   * 解析AI响应
   */
  parseAIResponse(response) {
    try {
      console.log('原始AI响应:', response.substring(0, 500) + '...')
      
      // 多层清理
      let cleanResponse = this.cleanJSONResponse(response)
      console.log('清理后的响应:', cleanResponse.substring(0, 500) + '...')
      
      // 尝试直接解析JSON
      let parsed = JSON.parse(cleanResponse)
      
      // 验证解析结果包含必要字段
      if (!parsed.data && !parsed.key_terms && !parsed.risk_points) {
        console.warn('DeepSeek API 响应缺少必要字段，尝试兼容模式解析')
        // 兼容模式：如果顶层结构不包含data字段，尝试直接使用顶层字段
        return {
          success: true,
          data: parsed,
          metadata: {
            model: 'deepseek-coder',
            analyzed_at: new Date().toISOString(),
            confidence: 0.8,
            parsing_method: 'compatibility_mode'
          }
        }
      }
      
      // 尝试修复常见的结构问题
      if (parsed.data) {
        parsed = parsed.data // 提取data部分
      }
      
      if (!parsed.key_terms && parsed.key_terms) {
        parsed.key_terms = parsed.key_terms
      }
      if (!parsed.risk_points && parsed.risk_points) {
        parsed.risk_points = parsed.risk_points
      }
      if (!parsed.key_dates && parsed.key_dates) {
        parsed.key_dates = parsed.key_dates
      }
      
      // 验证响应格式
      if (!parsed.key_terms && !parsed.risk_points && !parsed.key_dates) {
        throw new Error('AI响应缺少必要字段')
      }
      
      // 确保字段为数组
      parsed.key_terms = parsed.key_terms || []
      parsed.risk_points = parsed.risk_points || []
      parsed.key_dates = parsed.key_dates || []

      return {
        success: true,
        data: parsed,
        metadata: {
          model: 'deepseek-coder',
          analyzed_at: new Date().toISOString(),
          confidence: this.calculateOverallConfidence(parsed),
          parsing_method: 'standard'
        }
      }
    } catch (error) {
      console.error('解析AI响应失败:', error)
      console.error('问题响应:', response)
      
      // 尝试使用更宽松的解析
      try {
        const lenientResult = this.attemptLenientParse(response)
        lenientResult.metadata = {
          ...lenientResult.metadata,
          parsing_error: error.message,
          fallback_reason: 'json_parsing_failed',
          raw_response_preview: response.substring(0, 200)
        }
        return lenientResult
      } catch (lenientError) {
        throw new Error('AI响应解析失败: ' + error.message)
      }
    }
  }

  /**
   * 清理JSON响应 - 更健壮的实现
   */
  cleanJSONResponse(response) {
    let cleaned = response
    
    // 移除markdown标记和前后空白
    cleaned = cleaned
      .replace(/```json\s*/gi, '')
      .replace(/```\s*$/gi, '')
      .trim()
    
    // 移除可能的JSONP包装
    cleaned = cleaned.replace(/^[^\{\[]*(\{\[)/, '$1')
    cleaned = cleaned.replace(/(\}\])[^\}\]]*$/, '$1')
    
    // 修复常见的JSON格式问题
    // 1. 修复键名缺少引号的问题
    cleaned = cleaned.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
    
    // 2. 修复字符串值缺少引号的问题（更精确的匹配）
    cleaned = cleaned.replace(/:\s*([^",\[\]\{\}\s][^",\[\]\{\}]*?)([,]\}\])/g, ': "$1"$2')
    
    // 3. 移除尾部逗号
    cleaned = cleaned
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
    
    // 尝试处理未闭合的字符串
    try {
      // 寻找未闭合的引号
      let inString = false
      let escaped = false
      let lastQuoteIndex = -1
      
      for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i] === '\\' && inString) {
          escaped = !escaped
        } else if (cleaned[i] === '"' && !escaped) {
          inString = !inString
          lastQuoteIndex = i
        } else {
          escaped = false
        }
      }
      
      // 如果字符串未闭合，尝试修复
      if (inString && lastQuoteIndex > -1) {
        cleaned = cleaned.substring(0, lastQuoteIndex + 1) + cleaned.substring(lastQuoteIndex + 1).replace(/["\\]/g, '')
      }
    } catch (e) {
      console.warn('JSON字符串修复失败:', e.message)
    }
    
    // 修复换行和空格问题  
    cleaned = cleaned.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n')
    
    return cleaned
  }

  /**
   * 宽松解析尝试
   */
  attemptLenientParse(response) {
    console.log('尝试宽松解析...')
    
    // 提取关键信息的正则表达式
    const keyTerms = []
    const riskPoints = []
    const keyDates = []
    
    // 提取关键条款
    const termMatches = response.matchAll(/\{[^}]*"term"\s*:\s*"([^"]+)"[^}]*"value"\s*:\s*"([^"]+)"[^}]*\}/gi)
    for (const match of termMatches) {
      keyTerms.push({
        term: match[1],
        value: match[2],
        confidence: 0.8
      })
    }
    
    // 提取风险点
    const riskMatches = response.matchAll(/\{[^}]*"risk"\s*:\s*"([^"]+)"[^}]*"description"\s*:\s*"([^"]+)"[^}]*"level"\s*:\s*"([^"]+)"[^}]*\}/gi)
    for (const match of riskMatches) {
      riskPoints.push({
        risk: match[1],
        description: match[2],
        level: match[3],
        confidence: 0.75,
        suggestion: '请进一步评估此风险'
      })
    }
    
    // 提取日期
    const dateMatches = response.matchAll(/\{[^}]*"date_type"\s*:\s*"([^"]+)"[^}]*"date_value"\s*:\s*"([^"]+)"[^}]*\}/gi)
    for (const match of dateMatches) {
      keyDates.push({
        date_type: match[1],
        date_value: match[2],
        description: match[1],
        importance: 'medium'
      })
    }
    
    return {
      success: true,
      data: {
        key_terms: keyTerms,
        risk_points: riskPoints,
        key_dates: keyDates,
        summary: {
          contract_type: '商业合同',
          main_obligations: '需进一步分析',
          special_terms: '需进一步分析',
          compliance_notes: '建议专业法律审核'
        }
      },
      metadata: {
        model: 'deepseek-chat-lenient',
        analyzed_at: new Date().toISOString(),
        confidence: 0.75,
        parsing_method: 'lenient_regex'
      }
    }
  }

  /**
   * 计算整体置信度
   */
  calculateOverallConfidence(data) {
    const confidences = []
    
    if (data.key_terms) {
      data.key_terms.forEach(term => {
        if (term.confidence) confidences.push(term.confidence)
      })
    }
    
    if (data.risk_points) {
      data.risk_points.forEach(risk => {
        if (risk.confidence) confidences.push(risk.confidence)
      })
    }

    if (confidences.length === 0) return 0.5
    
    const average = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
    return Math.round(average * 100) / 100
  }

  /**
   * 处理API错误
   */
  handleAPIError(error) {
    if (error.response) {
      const status = error.response.status
      const data = error.response.data

      switch (status) {
        case 400:
          return new Error(`请求参数错误: ${data?.error?.message || '无效的请求格式'}`)
        case 401:
          return new Error('API密钥无效或已过期，请检查配置')
        case 403:
          return new Error('API访问被拒绝，权限不足')
        case 408:
          return new Error('请求超时，请检查网络连接')
        case 429:
          return new Error('API调用频率过高，已达到限制，请稍后重试')
        case 500:
          return new Error('DeepSeek服务器内部错误，请稍后重试')
        case 502:
          return new Error('网关错误，请稍后重试')
        case 503:
          return new Error('DeepSeek服务暂时不可用，服务维护中')
        case 504:
          return new Error('服务器响应超时，请稍后重试')
        default:
          return new Error(`API错误 (状态码: ${status}): ${data?.error?.message || data?.message || '未知错误'}`)
      }
    } else if (error.code === 'ECONNABORTED') {
      return new Error('请求超时，AI分析服务响应时间过长')
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new Error('无法连接到DeepSeek服务器，请检查网络连接和API地址')
    } else if (error.code === 'ETIMEDOUT') {
      return new Error('网络超时，请稍后重试')
    } else if (error.name === 'TypeError') {
      return new Error(`类型错误: ${error.message}`)
    } else {
      return new Error(`网络错误: ${error.message}`)
    }
  }

  /**
   * 获取模型信息
   */
  getModelInfo() {
    return {
      provider: 'DeepSeek',
      model: 'deepseek-chat',
      enabled: this.isEnabled,
      features: [
        '合同条款分析',
        '风险点识别', 
        '关键信息提取',
        '法律合规检查'
      ]
    }
  }
}

// 创建全局实例
export const deepseekAPI = new DeepSeekAPI()

// 注册健康检查
healthMonitor.registerService('DeepSeek API', async () => {
  return await deepseekAPI.checkHealth()
})