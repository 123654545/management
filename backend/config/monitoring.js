/**
 * 监控和日志配置
 */

/**
 * AI分析监控指标
 */
export const AnalysisMetrics = {
  // 请求计数器
  requests: {
    total: 0,
    deepseek: 0,
    simulate: 0,
    fallback: 0,
    failed: 0
  },
  
  // 性能指标
  performance: {
    totalTime: 0,
    averageTime: 0,
    minTime: Infinity,
    maxTime: 0
  },
  
  // 错误统计
  errors: {
    network: 0,
    parse: 0,
    timeout: 0,
    rateLimit: 0,
    circuitBreaker: 0,
    other: 0
  },

  // 重试统计
  retries: {
    total: 0,
    successful: 0,
    failed: 0
  },

  // 熔断器统计
  circuitBreaker: {
    opens: 0,
    closes: 0,
    halfOpens: 0
  },

  // 记录指标
  record(type, data = {}) {
    this.requests.total++
    
    switch (type) {
      case 'deepseek_success':
        this.requests.deepseek++
        this.performance.totalTime += data.duration
        this.updatePerformance(data.duration)
        break
        
      case 'simulate_success':
        this.requests.simulate++
        this.performance.totalTime += data.duration
        this.updatePerformance(data.duration)
        break
        
      case 'fallback_used':
        this.requests.fallback++
        break
        
      case 'analysis_failed':
        this.requests.failed++
        this.categorizeError(data.error)
        break
        
      case 'retry_attempted':
        this.retries.total++
        if (data.success) {
          this.retries.successful++
        } else {
          this.retries.failed++
        }
        break
        
      case 'circuit_opened':
        this.circuitBreaker.opens++
        break
        
      case 'circuit_closed':
        this.circuitBreaker.closes++
        break
        
      case 'circuit_half_open':
        this.circuitBreaker.halfOpens++
        break
    }
  },

  // 更新性能指标
  updatePerformance(duration) {
    this.performance.minTime = Math.min(this.performance.minTime, duration)
    this.performance.maxTime = Math.max(this.performance.maxTime, duration)
    
    if (this.requests.total > 0) {
      this.performance.averageTime = this.performance.totalTime / 
        (this.requests.deepseek + this.requests.simulate)
    }
  },

  // 分类错误
  categorizeError(error) {
    if (!error) {
      this.errors.other++
      return
    }

    const message = error.message?.toLowerCase() || ''
    const code = error.code || ''

    if (message.includes('timeout') || code.includes('TIMEOUT')) {
      this.errors.timeout++
    } else if (message.includes('network') || code.includes('ECONN')) {
      this.errors.network++
    } else if (message.includes('parse') || message.includes('json')) {
      this.errors.parse++
    } else if (message.includes('rate limit') || code === 'RATE_LIMIT') {
      this.errors.rateLimit++
    } else if (code === 'CIRCUIT_BREAKER_OPEN') {
      this.errors.circuitBreaker++
    } else {
      this.errors.other++
    }
  },

  // 获取指标摘要
  getSummary() {
    const successRate = this.requests.total > 0 ? 
      ((this.requests.total - this.requests.failed) / this.requests.total * 100).toFixed(2) : 0
    
    const deepseekUsageRate = (this.requests.deepseek + this.requests.fallback) > 0 ?
      (this.requests.deepseek / (this.requests.deepseek + this.requests.fallback) * 100).toFixed(2) : 0
    
    return {
      requests: { ...this.requests },
      performance: { ...this.performance },
      errors: { ...this.errors },
      retries: { ...this.retries },
      circuitBreaker: { ...this.circuitBreaker },
      rates: {
        success: `${successRate}%`,
        deepseekUsage: `${deepseekUsageRate}%`,
        fallback: `${(100 - deepseekUsageRate).toFixed(2)}%`
      },
      timestamp: new Date().toISOString()
    }
  },

  // 重置指标
  reset() {
    this.requests = { total: 0, deepseek: 0, simulate: 0, fallback: 0, failed: 0 }
    this.performance = { totalTime: 0, averageTime: 0, minTime: Infinity, maxTime: 0 }
    this.errors = { network: 0, parse: 0, timeout: 0, rateLimit: 0, circuitBreaker: 0, other: 0 }
    this.retries = { total: 0, successful: 0, failed: 0 }
    this.circuitBreaker = { opens: 0, closes: 0, halfOpens: 0 }
  }
}

/**
 * 日志记录器
 */
export class Logger {
  constructor(level = 'info') {
    this.level = level
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    }
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.level]
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString()
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaStr}`
  }

  debug(message, meta = {}) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta))
    }
  }

  info(message, meta = {}) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, meta))
    }
  }

  warn(message, meta = {}) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta))
    }
  }

  error(message, meta = {}) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta))
    }
  }

  // 分析专用日志
  logAnalysis(type, data) {
    const message = this.getAnalysisMessage(type, data)
    const meta = this.sanitizeMetadata(data)
    
    switch (type) {
      case 'analysis_started':
        this.info(message, meta)
        break
      case 'analysis_completed':
        this.info(message, meta)
        AnalysisMetrics.record(data.method + '_success', data)
        break
      case 'analysis_failed':
        this.error(message, meta)
        AnalysisMetrics.record('analysis_failed', data)
        break
      case 'fallback_used':
        this.warn(message, meta)
        AnalysisMetrics.record('fallback_used', data)
        break
      case 'circuit_state_change':
        this.warn(message, meta)
        AnalysisMetrics.record('circuit_' + data.state, data)
        break
      case 'retry_attempted':
        this.warn(message, meta)
        AnalysisMetrics.record('retry_attempted', data)
        break
      default:
        this.debug(message, meta)
    }
  }

  getAnalysisMessage(type, data) {
    switch (type) {
      case 'analysis_started':
        return `开始分析合同 ${data.contractId} (方法: ${data.method})`
      case 'analysis_completed':
        return `合同 ${data.contractId} 分析完成 (耗时: ${data.duration}ms, 方法: ${data.method})`
      case 'analysis_failed':
        return `合同 ${data.contractId} 分析失败 (错误: ${data.error?.message || '未知'})`
      case 'fallback_used':
        return `合同 ${data.contractId} 使用降级方案 (原因: ${data.reason})`
      case 'circuit_state_change':
        return `熔断器状态变更: ${data.from} -> ${data.to} (服务: ${data.service})`
      case 'retry_attempted':
        return `重试分析 ${data.contractId} (第${data.attempt}次, 成功: ${data.success})`
      default:
        return `分析事件: ${type}`
    }
  }

  sanitizeMetadata(data) {
    const sanitized = { ...data }
    
    // 移除敏感信息
    delete sanitized.text
    delete sanitized.extracted_text
    delete sanitized.user
    delete sanitized.authorization
    
    return sanitized
  }
}

// 创建全局日志器实例
export const logger = new Logger(
  process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'info')
)

/**
 * 性能监控装饰器
 */
export const performanceMonitor = (operationName) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value
    
    descriptor.value = async function(...args) {
      const startTime = Date.now()
      const operationId = `${operationName}_${Date.now()}`
      
      try {
        logger.debug(`开始操作: ${operationName}`, { operationId, args: args.length })
        
        const result = await originalMethod.apply(this, args)
        
        const duration = Date.now() - startTime
        logger.debug(`操作完成: ${operationName}`, { 
          operationId, 
          duration, 
          success: true 
        })
        
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        logger.debug(`操作失败: ${operationName}`, { 
          operationId, 
          duration, 
          success: false,
          error: error.message 
        })
        
        throw error
      }
    }
    
    return descriptor
  }
}

/**
 * 定期报告生成器
 */
export class ReportGenerator {
  constructor(intervalMinutes = 60) {
    this.intervalMs = intervalMinutes * 60 * 1000
    this.timer = null
  }

  start() {
    if (this.timer) {
      this.stop()
    }

    this.timer = setInterval(() => {
      this.generateReport()
    }, this.intervalMs)

    logger.info('监控报告生成器已启动', { 
      intervalMinutes: this.intervalMs / (60 * 1000) 
    })
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
      logger.info('监控报告生成器已停止')
    }
  }

  generateReport() {
    const summary = AnalysisMetrics.getSummary()
    
    logger.info('AI分析性能报告', {
      summary,
      timestamp: new Date().toISOString()
    })

    // 可以在这里添加额外的报告逻辑，比如：
    // - 发送到监控系统
    // - 写入文件
    // - 发送邮件告警
    this.checkAlerts(summary)
  }

  checkAlerts(summary) {
    // 成功率低于80%时告警
    if (parseFloat(summary.rates.success) < 80) {
      logger.warn('AI分析成功率低于阈值', { 
        successRate: summary.rates.success,
        threshold: '80%'
      })
    }

    // 熔断器开启频率过高时告警
    if (summary.circuitBreaker.opens > 5) {
      logger.error('熔断器开启频率过高', { 
        opens: summary.circuitBreaker.opens,
        threshold: 5
      })
    }

    // 错误率过高时告警
    const errorRate = (summary.requests.failed / summary.requests.total * 100).toFixed(2)
    if (errorRate > 20) {
      logger.warn('AI分析错误率过高', { 
        errorRate: `${errorRate}%`,
        threshold: '20%'
      })
    }
  }
}

// 创建全局报告生成器实例
export const reportGenerator = new ReportGenerator(60) // 每60分钟生成一次报告