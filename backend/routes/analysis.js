import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { supabase } from '../config/database.js'
import { deepseekAPI } from '../config/ai.js'
import { 
  AppError, 
  ExternalServiceError, 
  asyncHandler,
  errorHandler as globalErrorHandler 
} from '../middleware/errorHandler.js'
import { healthMonitor, deepseekCircuitBreaker } from '../middleware/circuitBreaker.js'

const router = express.Router()

/**
 * 模拟AI分析（降级方案）
 */
async function simulateAnalysis(text) {
  console.log('使用模拟AI分析...')
  
  // 模拟分析延迟
  await new Promise(resolve => setTimeout(resolve, 2000))

  // 模拟关键条款提取
  const keyTerms = []
  if (text.includes('甲方') || text.toLowerCase().includes('party a')) {
    keyTerms.push({ 
      term: '甲方', 
      value: '示例甲方公司',
      confidence: 0.8
    })
  }
  if (text.includes('乙方') || text.toLowerCase().includes('party b')) {
    keyTerms.push({ 
      term: '乙方', 
      value: '示例乙方公司',
      confidence: 0.8
    })
  }
  if (text.match(/[\d,]+元|USD\s*[\d,]+|\$[\d,]+/)) {
    keyTerms.push({ 
      term: '合同金额', 
      value: '¥100,000.00',
      confidence: 0.9
    })
  }
  if (text.includes('服务期限') || text.toLowerCase().includes('term')) {
    keyTerms.push({ 
      term: '服务期限', 
      value: '12个月',
      confidence: 0.85
    })
  }

  // 模拟风险点识别
  const riskPoints = []
  if (text.includes('自动续约') || text.toLowerCase().includes('auto-renew')) {
    riskPoints.push({
      risk: '自动续约风险',
      description: '合同可能自动续约，需注意取消条款',
      level: 'medium',
      suggestion: '建议在合同到期前30天发送书面通知终止续约',
      confidence: 0.75,
      related_clause: '自动续约条款'
    })
  }
  if (text.includes('违约金') || text.toLowerCase().includes('penalty')) {
    riskPoints.push({
      risk: '高额违约金',
      description: '违约金比例较高，请谨慎履约',
      level: 'high',
      suggestion: '严格按照合同约定履行义务，避免违约情况发生',
      confidence: 0.8,
      related_clause: '违约责任条款'
    })
  }
  if (text.includes('独家') || text.toLowerCase().includes('exclusive')) {
    riskPoints.push({
      risk: '独家限制',
      description: '合同包含独家条款，可能限制与其他方合作',
      level: 'medium',
      suggestion: '评估独家限制对业务的影响，考虑合作期限的合理性',
      confidence: 0.7,
      related_clause: '独家合作条款'
    })
  }

  // 模拟关键日期提取
  const keyDates = []
  const dateRegex = /(\d{4}[-年]\d{1,2}[-月]\d{1,2}[日]?|\d{1,2}\/\d{1,2}\/\d{4})/g
  const dates = text.match(dateRegex) || []
  
  dates.forEach((date, index) => {
    const dateType = index === 0 ? '签订日期' : 
                    index === dates.length - 1 ? '到期日期' : 
                    '重要日期'
    keyDates.push({
      date_type: dateType,
      date_value: date.replace(/[年月日]/g, (match) => {
        return { '年': '-', '月': '-', '日': '' }[match] || match
      }),
      description: `${dateType}：${date}`,
      importance: index === 0 || index === dates.length - 1 ? 'high' : 'medium'
    })
  })

  // 模拟合同摘要
  const summary = {
    contract_type: '商业服务合同',
    main_obligations: '提供约定的服务并收取相应费用',
    special_terms: '标准商业条款',
    compliance_notes: '建议咨询专业法律人士进行最终审核'
  }

  return {
    success: true,
    data: {
      key_terms: keyTerms,
      risk_points: riskPoints,
      key_dates: keyDates,
      summary: summary
    },
    metadata: {
      model: 'simulate',
      analyzed_at: new Date().toISOString(),
      confidence: 0.7
    }
  }
}

/**
 * 统一的合同分析函数（带错误处理和降级机制）
 */
async function analyzeContract(text, contractTitle = '', context = {}) {
  let analysisResult = null
  let analysisMethod = 'unknown'
  let error = null

  try {
    // 检查熔断器状态
    const circuitState = deepseekCircuitBreaker.getState()
    if (circuitState.state === 'OPEN') {
      console.warn(`DeepSeek熔断器开启，降级到模拟分析。原因：${circuitState.failureCount}次连续失败`)
      analysisResult = await simulateAnalysis(text)
      analysisMethod = 'simulate_fallback'
    } else if (deepseekAPI.getModelInfo().enabled) {
      try {
        console.log('使用DeepSeek API进行分析...')
        
        // 检查API健康状态（使用缓存避免频繁检查）
        const healthCheck = async () => {
          const healthResult = await healthMonitor.checkService('DeepSeek API')
          return healthResult.status === 'healthy'
        }

        const isHealthy = await healthCheck()
        if (!isHealthy) {
          console.warn('DeepSeek API不健康，降级到模拟分析')
          analysisResult = await simulateAnalysis(text)
          analysisMethod = 'simulate_health_check_failed'
        } else {
          const result = await deepseekAPI.analyzeContract(text, contractTitle)
          console.log('DeepSeek API分析完成')
          analysisResult = result
          analysisMethod = 'deepseek'
        }
      } catch (apiError) {
        error = apiError
        console.error('DeepSeek API分析失败，降级到模拟分析:', apiError.message)
        
        // 如果是熔断器开启错误，直接使用模拟分析
        if (apiError.code === 'CIRCUIT_BREAKER_OPEN') {
          analysisResult = await simulateAnalysis(text)
          analysisMethod = 'simulate_circuit_open'
        } else {
          // 其他错误也降级到模拟分析
          try {
            analysisResult = await simulateAnalysis(text)
            analysisMethod = 'simulate_error_fallback'
          } catch (fallbackError) {
            console.error('模拟分析也失败了:', fallbackError)
            throw new AppError('合同分析服务暂时不可用，请稍后重试', 503, 'ANALYSIS_SERVICE_UNAVAILABLE')
          }
        }
      }
    } else {
      console.warn('DeepSeek API未启用，使用模拟分析')
      analysisResult = await simulateAnalysis(text)
      analysisMethod = 'simulate_disabled'
    }

    // 添加分析元数据
    if (analysisResult && analysisResult.data) {
      analysisResult.metadata = {
        ...analysisResult.metadata,
        analysis_method: analysisMethod,
        fallback_used: analysisMethod.startsWith('simulate'),
        original_error: error ? error.message : null,
        circuit_state: deepseekCircuitBreaker.getState(),
        context
      }
    }

    return analysisResult

  } catch (finalError) {
    console.error('合同分析完全失败:', finalError)
    
    // 记录失败上下文
    const failureContext = {
      textLength: text?.length || 0,
      title: contractTitle,
      method: analysisMethod,
      error: finalError.message,
      timestamp: new Date().toISOString(),
      ...context
    }
    
    console.error('分析失败上下文:', failureContext)
    
    throw finalError
  }
}

/**
 * 分析请求限流检查
 */
async function checkAnalysisLimits(userId, contractId) {
  // 检查用户是否有正在进行的分析
  const { data: ongoingAnalysis } = await supabase
    .from('contract_analyses')
    .select('id')
    .eq('contract_id', contractId)
    .eq('analysis_status', 'processing')
    .single()

  if (ongoingAnalysis) {
    throw new AppError('该合同正在分析中，请等待当前分析完成', 409, 'ANALYSIS_IN_PROGRESS')
  }

  // 检查用户同时分析数量限制（最多3个）
  const { data: userAnalyses } = await supabase
    .from('contract_analyses')
    .select('id')
    .eq('contract_id', contractId)
    .eq('analysis_status', 'processing')
    .limit(3)

  if (userAnalyses && userAnalyses.length >= 3) {
    throw new AppError('同时分析合同数量过多，请等待部分分析完成', 429, 'TOO_MANY_ANALYSES')
  }
}

/**
 * 获取合同分析结果
 */
router.get('/contract/:contractId', authenticateToken, async (req, res) => {
  try {
    const { contractId } = req.params

    // 验证合同是否属于当前用户
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, user_id')
      .eq('id', contractId)
      .eq('user_id', req.user.id)
      .single()

    if (contractError || !contract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在'
      })
    }

    // 获取分析结果
    const { data: analysis, error } = await supabase
      .from('contract_analyses')
      .select('*')
      .eq('contract_id', contractId)
      .single()

    if (error) {
      return res.status(404).json({
        success: false,
        message: '分析结果不存在'
      })
    }

    res.json({
      success: true,
      data: analysis
    })
  } catch (error) {
    console.error('获取分析结果错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 启动合同分析
 */
router.post('/contract/:contractId/analyze', authenticateToken, asyncHandler(async (req, res) => {
  const { contractId } = req.params
  const startTime = Date.now()

  // 验证合同是否属于当前用户
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('id, user_id, extracted_text, title, file_size')
    .eq('id', contractId)
    .eq('user_id', req.user.id)
    .single()

  if (contractError || !contract) {
    throw new AppError('合同不存在', 404, 'CONTRACT_NOT_FOUND')
  }

  if (!contract.extracted_text || contract.extracted_text.trim().length === 0) {
    throw new AppError('合同文本为空，无法进行分析', 400, 'EMPTY_CONTRACT_TEXT')
  }

  // 检查分析限制
  await checkAnalysisLimits(req.user.id, contractId)

  // 更新分析状态为处理中
  const { error: updateError } = await supabase
    .from('contract_analyses')
    .update({
      analysis_status: 'processing',
      error_message: null,
      started_at: new Date().toISOString(),
      ai_model: 'pending'
    })
    .eq('contract_id', contractId)

  if (updateError) {
    throw new AppError('更新分析状态失败', 500, 'STATUS_UPDATE_FAILED')
  }

  // 构建分析上下文
  const analysisContext = {
    userId: req.user.id,
    contractId,
    title: contract.title,
    fileSize: contract.file_size,
    startTime: startTime,
    userAgent: req.get('User-Agent')
  }

  // 异步执行分析（不等待结果）
  analyzeContract(contract.extracted_text, contract.title, analysisContext)
    .then(async (result) => {
      const analysisTime = Date.now() - startTime
      console.log(`合同 ${contractId} 分析完成，耗时 ${analysisTime}ms`)

      try {
        if (result.success && result.data) {
          const updateData = {
            key_terms: result.data.key_terms || [],
            risk_points: result.data.risk_points || [],
            key_dates: result.data.key_dates || [],
            summary: result.data.summary || {},
            analysis_status: 'completed',
            analyzed_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            error_message: null,
            ai_model: result.metadata?.model || 'unknown',
            confidence_score: result.metadata?.confidence || null,
            analysis_method: result.metadata?.analysis_method || 'unknown',
            analysis_time_ms: analysisTime,
            metadata: result.metadata
          }

          const { error: saveError } = await supabase
            .from('contract_analyses')
            .update(updateData)
            .eq('contract_id', contractId)

          if (saveError) {
            console.error('保存分析结果失败:', saveError)
            throw new Error('保存分析结果失败')
          }

          // 记录成功统计
          console.log(`分析成功统计: 方法=${result.metadata?.analysis_method}, 耗时=${analysisTime}ms`)
        } else {
          throw new Error(result.message || '分析返回无效结果')
        }
      } catch (saveError) {
        console.error('处理分析结果失败:', saveError)
        
        // 更新状态为保存失败
        await supabase
          .from('contract_analyses')
          .update({
            analysis_status: 'failed',
            error_message: `保存结果失败: ${saveError.message}`,
            completed_at: new Date().toISOString(),
            analysis_time_ms: analysisTime
          })
          .eq('contract_id', contractId)
          .catch(err => console.error('更新失败状态也出错:', err))
      }
    })
    .catch(async (analysisError) => {
      const analysisTime = Date.now() - startTime
      console.error(`合同 ${contractId} 分析失败，耗时 ${analysisTime}ms:`, analysisError)

      // 更新状态为分析失败
      const errorMessage = analysisError.message || '分析过程出现未知错误'
      const errorData = {
        analysis_status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
        analysis_time_ms: analysisTime,
        error_details: {
          code: analysisError.code,
          stack: process.env.NODE_ENV === 'development' ? analysisError.stack : undefined,
          circuit_state: deepseekCircuitBreaker.getState()
        }
      }

      await supabase
        .from('contract_analyses')
        .update(errorData)
        .eq('contract_id', contractId)
        .catch(err => console.error('更新失败状态也出错:', err))

      // 记录失败统计
      console.log(`分析失败统计: 错误=${analysisError.code}, 耗时=${analysisTime}ms`)
    })

  // 立即返回响应
  const responseData = {
    contractId,
    model: deepseekAPI.getModelInfo().enabled ? 'deepseek' : 'simulate',
    estimatedTime: Math.max(5, Math.ceil(contract.extracted_text.length / 1000)), // 估算时间（秒）
    circuitState: deepseekCircuitBreaker.getState().state
  }

  res.status(202).json({
    success: true,
    message: '分析任务已启动，请稍后查看结果',
    data: responseData
  })
}))

/**
 * 重新分析合同
 */
router.post('/contract/:contractId/retry', authenticateToken, async (req, res) => {
  try {
    const { contractId } = req.params

    // 验证合同是否属于当前用户
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, user_id, extracted_text, title')
      .eq('id', contractId)
      .eq('user_id', req.user.id)
      .single()

    if (contractError || !contract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在'
      })
    }

    // 重置分析状态
    const { error: resetError } = await supabase
      .from('contract_analyses')
      .update({
        analysis_status: 'pending',
        error_message: null,
        key_terms: [],
        risk_points: [],
        key_dates: [],
        summary: {},
        started_at: null,
        completed_at: null,
        ai_model: null,
        confidence_score: null
      })
      .eq('contract_id', contractId)

    if (resetError) {
      return res.status(500).json({
        success: false,
        message: '重置分析状态失败'
      })
    }

    // 重新启动分析
    res.redirect(307, `/analysis/contract/${contractId}/analyze`)
  } catch (error) {
    console.error('重新分析错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 获取分析统计信息
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // 获取用户的合同分析统计
    const { data, error } = await supabase
      .from('contract_analyses')
      .select(`
        analysis_status,
        confidence_score,
        ai_model,
        contracts!inner(user_id)
      `)
      .eq('contracts.user_id', req.user.id)

    if (error) {
      return res.status(500).json({
        success: false,
        message: '获取统计信息失败'
      })
    }

    const stats = {
      total: data.length,
      pending: data.filter(item => item.analysis_status === 'pending').length,
      processing: data.filter(item => item.analysis_status === 'processing').length,
      completed: data.filter(item => item.analysis_status === 'completed').length,
      failed: data.filter(item => item.analysis_status === 'failed').length,
      by_model: {
        deepseek: data.filter(item => item.ai_model === 'deepseek').length,
        simulate: data.filter(item => item.ai_model === 'simulate').length
      },
      avg_confidence: data
        .filter(item => item.confidence_score)
        .reduce((sum, item, _, filtered) => sum + item.confidence_score / filtered.length, 0).toFixed(2)
    }

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('获取统计信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 获取AI模型信息
 */
router.get('/model-info', authenticateToken, (req, res) => {
  try {
    const modelInfo = deepseekAPI.getModelInfo()
    res.json({
      success: true,
      data: modelInfo
    })
  } catch (error) {
    console.error('获取模型信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 健康检查API（用于测试）
 */
router.get('/health', authenticateToken, asyncHandler(async (req, res) => {
  const [deepseekHealthy, allServices] = await Promise.allSettled([
    deepseekAPI.checkHealth(),
    healthMonitor.checkAllServices()
  ])

  res.json({
    success: true,
    data: {
      deepseek_healthy: deepseekHealthy.status === 'fulfilled' ? deepseekHealthy.value : false,
      services: allServices.status === 'fulfilled' ? allServices.value : null,
      timestamp: new Date().toISOString()
    }
  })
}))

/**
 * 获取熔断器状态（管理员功能）
 */
router.get('/circuit-breaker', authenticateToken, asyncHandler(async (req, res) => {
  // 这里可以添加管理员权限检查
  // if (!req.user.isAdmin) {
  //   throw new ForbiddenError('需要管理员权限')
  // }

  const circuitState = deepseekCircuitBreaker.getState()
  const serviceStats = healthMonitor.getServiceStats()

  res.json({
    success: true,
    data: {
      circuitBreaker: circuitState,
      services: serviceStats,
      deepseekAPI: deepseekAPI.getModelInfo()
    }
  })
}))

/**
 * 重置熔断器（管理员功能）
 */
router.post('/circuit-breaker/reset', authenticateToken, asyncHandler(async (req, res) => {
  // 这里可以添加管理员权限检查
  // if (!req.user.isAdmin) {
  //   throw new ForbiddenError('需要管理员权限')
  // }

  deepseekCircuitBreaker.reset()
  
  res.json({
    success: true,
    message: '熔断器已重置',
    data: {
      circuitBreaker: deepseekCircuitBreaker.getState(),
      timestamp: new Date().toISOString()
    }
  })
}))

/**
 * 获取分析失败统计
 */
router.get('/failure-stats', authenticateToken, asyncHandler(async (req, res) => {
  const { days = 7 } = req.query
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - parseInt(days))

  const { data, error } = await supabase
    .from('contract_analyses')
    .select(`
      analysis_status,
      error_message,
      analysis_method,
      ai_model,
      completed_at,
      contracts!inner(user_id)
    `)
    .eq('contracts.user_id', req.user.id)
    .gte('completed_at', startDate.toISOString())
    .eq('analysis_status', 'failed')

  if (error) {
    throw new AppError('获取失败统计失败', 500, 'STATS_ERROR')
  }

  // 按错误类型分组
  const errorGroups = {}
  data.forEach(item => {
    const errorType = item.error_message?.substring(0, 50) || '未知错误'
    if (!errorGroups[errorType]) {
      errorGroups[errorType] = {
        count: 0,
        method: item.analysis_method || 'unknown',
        model: item.ai_model || 'unknown'
      }
    }
    errorGroups[errorType].count++
  })

  res.json({
    success: true,
    data: {
      totalFailures: data.length,
      period: `${days}天`,
      errorGroups,
      failuresByDay: groupFailuresByDay(data),
      timestamp: new Date().toISOString()
    }
  })
}))

/**
 * 按日期分组失败数据
 */
function groupFailuresByDay(failures) {
  const groups = {}
  
  failures.forEach(failure => {
    const date = new Date(failure.completed_at).toISOString().split('T')[0]
    if (!groups[date]) {
      groups[date] = 0
    }
    groups[date]++
  })

  return Object.entries(groups)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export default router