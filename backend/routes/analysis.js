import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { supabase } from '../config/database.js'

const router = express.Router()

/**
 * AI 合同分析（模拟实现）
 */
async function analyzeContract(text) {
  try {
    // 这里应该调用真实的 AI API（OpenAI, Google AI 等）
    // 目前使用模拟结果用于演示
    

    
    // 模拟分析延迟
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 模拟关键条款提取
    const keyTerms = []
    if (text.includes('甲方') || text.includes('party a')) {
      keyTerms.push({ term: '甲方', value: '示例甲方公司' })
    }
    if (text.includes('乙方') || text.includes('party b')) {
      keyTerms.push({ term: '乙方', value: '示例乙方公司' })
    }
    if (text.match(/[\d,]+元|USD\s*[\d,]+|\$[\d,]+/)) {
      keyTerms.push({ term: '合同金额', value: '¥100,000.00' })
    }
    if (text.includes('服务期限') || text.includes('term')) {
      keyTerms.push({ term: '服务期限', value: '12个月' })
    }

    // 模拟风险点识别
    const riskPoints = []
    if (text.includes('自动续约') || text.includes('auto-renew')) {
      riskPoints.push({
        risk: '自动续约风险',
        description: '合同可能自动续约，需注意取消条款',
        level: '中'
      })
    }
    if (text.includes('违约金') || text.includes('penalty')) {
      riskPoints.push({
        risk: '高额违约金',
        description: '违约金比例较高，请谨慎履约',
        level: '高'
      })
    }
    if (text.includes('独家') || text.includes('exclusive')) {
      riskPoints.push({
        risk: '独家限制',
        description: '合同包含独家条款，可能限制与其他方合作',
        level: '中'
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
        })
      })
    })



    return {
      keyTerms,
      riskPoints,
      keyDates
    }
  } catch (error) {
    console.error('AI 分析错误:', error)
    throw error
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
router.post('/contract/:contractId/analyze', authenticateToken, async (req, res) => {
  try {
    const { contractId } = req.params

    // 验证合同是否属于当前用户
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, user_id, extracted_text')
      .eq('id', contractId)
      .eq('user_id', req.user.id)
      .single()

    if (contractError || !contract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在'
      })
    }

    if (!contract.extracted_text) {
      return res.status(400).json({
        success: false,
        message: '合同文本为空，无法进行分析'
      })
    }

    // 更新分析状态为处理中
    const { error: updateError } = await supabase
      .from('contract_analyses')
      .update({
        analysis_status: 'processing',
        error_message: null
      })
      .eq('contract_id', contractId)

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: '更新分析状态失败'
      })
    }

    // 异步执行分析
    analyzeContract(contract.extracted_text)
      .then(async (result) => {
        try {
          await supabase
            .from('contract_analyses')
            .update({
              key_terms: result.keyTerms,
              risk_points: result.riskPoints,
              key_dates: result.keyDates,
              analysis_status: 'completed',
              analyzed_at: new Date().toISOString()
            })
            .eq('contract_id', contractId)
        } catch (error) {
          console.error('保存分析结果失败:', error)
          await supabase
            .from('contract_analyses')
            .update({
              analysis_status: 'failed',
              error_message: '保存分析结果失败'
            })
            .eq('contract_id', contractId)
        }
      })
      .catch(async (error) => {
        console.error('AI 分析失败:', error)
        await supabase
          .from('contract_analyses')
          .update({
            analysis_status: 'failed',
            error_message: error.message || '分析过程出现未知错误'
          })
          .eq('contract_id', contractId)
      })

    res.json({
      success: true,
      message: '分析任务已启动，请稍后查看结果'
    })
  } catch (error) {
    console.error('启动分析错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 重新分析合同
 */
router.post('/contract/:contractId/retry', authenticateToken, async (req, res) => {
  try {
    const { contractId } = req.params

    // 验证合同是否属于当前用户
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, user_id, extracted_text')
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
        key_dates: []
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
      failed: data.filter(item => item.analysis_status === 'failed').length
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

export default router