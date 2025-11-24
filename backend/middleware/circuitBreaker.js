/**
 * 熔断器模式实现
 * 防止级联失败，提供快速失败机制
 */

export class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'CircuitBreaker'
    this.failureThreshold = options.failureThreshold || 5
    this.resetTimeout = options.resetTimeout || 60000 // 60秒
    this.monitoringPeriod = options.monitoringPeriod || 10000 // 10秒
    
    this.state = 'CLOSED' // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = null
    this.nextAttempt = null
    
    // 统计信息
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      circuitOpens: 0,
      lastStateChange: new Date().toISOString()
    }

    // 绑定方法
    this.call = this.call.bind(this)
  }

  /**
   * 执行被保护的函数
   */
  async call(fn, ...args) {
    this.stats.totalRequests++

    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const error = new Error(`熔断器 ${this.name} 处于开启状态`)
        error.code = 'CIRCUIT_BREAKER_OPEN'
        error.circuitBreakerInfo = {
          name: this.name,
          state: this.state,
          nextAttempt: this.nextAttempt
        }
        throw error
      } else {
        this.state = 'HALF_OPEN'
        this.successCount = 0
        this.updateStats()
      }
    }

    try {
      const result = await fn(...args)
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * 成功时的处理
   */
  onSuccess() {
    this.failureCount = 0
    this.stats.totalSuccesses++

    if (this.state === 'HALF_OPEN') {
      this.successCount++
      if (this.successCount >= 3) { // 连续3次成功后关闭熔断器
        this.state = 'CLOSED'
        this.updateStats()
      }
    }
  }

  /**
   * 失败时的处理
   */
  onFailure() {
    this.failureCount++
    this.stats.totalFailures++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.failureThreshold) {
      if (this.state !== 'OPEN') {
        this.state = 'OPEN'
        this.nextAttempt = Date.now() + this.resetTimeout
        this.stats.circuitOpens++
        this.updateStats()
        
        console.warn(`熔断器 ${this.name} 已开启，${this.resetTimeout}ms后尝试恢复`)
      }
    }
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    this.stats.lastStateChange = new Date().toISOString()
    this.stats.currentState = this.state
  }

  /**
   * 获取熔断器状态
   */
  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureThreshold: this.failureThreshold,
      nextAttempt: this.nextAttempt,
      timeToNextAttempt: this.state === 'OPEN' ? Math.max(0, this.nextAttempt - Date.now()) : 0,
      stats: { ...this.stats }
    }
  }

  /**
   * 手动重置熔断器
   */
  reset() {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = null
    this.nextAttempt = null
    this.updateStats()
    console.log(`熔断器 ${this.name} 已手动重置`)
  }
}

/**
 * 重试机制实现
 */
export class RetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3
    this.baseDelay = options.baseDelay || 1000
    this.maxDelay = options.maxDelay || 10000
    this.backoffMultiplier = options.backoffMultiplier || 2
    this.retryableErrors = options.retryableErrors || [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'EHOSTUNREACH',
      'EPIPE',
      'ENOTFOUND'
    ]
  }

  /**
   * 执行带重试的异步函数
   */
  async call(fn, context = {}) {
    let lastError
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        
        if (attempt === this.maxRetries) {
          break
        }

        if (!this.shouldRetry(error)) {
          break
        }

        const delay = this.calculateDelay(attempt)
        console.warn(`重试 ${attempt + 1}/${this.maxRetries}，${delay}ms后重试:`, error.message)
        
        await this.sleep(delay)
      }
    }

    // 增加重试信息到错误对象
    if (lastError) {
      lastError.retryInfo = {
        attempts: this.maxRetries + 1,
        totalRetries: this.maxRetries,
        context
      }
    }
    
    throw lastError
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry(error) {
    // 检查错误码
    if (error.code && this.retryableErrors.includes(error.code)) {
      return true
    }

    // 检查HTTP状态码
    if (error.response?.status) {
      const retryableStatusCodes = [408, 429, 500, 502, 503, 504]
      return retryableStatusCodes.includes(error.response.status)
    }

    // 检查特定错误消息
    const retryableMessages = [
      'timeout',
      'connection',
      'network',
      'rate limit',
      'server error'
    ]
    
    const message = error.message?.toLowerCase() || ''
    return retryableMessages.some(msg => message.includes(msg))
  }

  /**
   * 计算重试延迟（指数退避）
   */
  calculateDelay(attempt) {
    const delay = Math.min(
      this.baseDelay * Math.pow(this.backoffMultiplier, attempt),
      this.maxDelay
    )
    
    // 添加随机抖动，避免雷群效应
    const jitter = delay * 0.1 * Math.random()
    return Math.floor(delay + jitter)
  }

  /**
   * 延迟函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * 创建熔断器装饰器
 */
export const withCircuitBreaker = (circuitBreaker) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value
    
    descriptor.value = async function(...args) {
      return circuitBreaker.call(() => originalMethod.apply(this, args))
    }
    
    return descriptor
  }
}

/**
 * 创建重试装饰器
 */
export const withRetry = (retryHandler) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value
    
    descriptor.value = async function(...args) {
      return retryHandler.call(() => originalMethod.apply(this, args), {
        class: target.constructor.name,
        method: propertyKey
      })
    }
    
    return descriptor
  }
}

/**
 * 服务健康监控器
 */
export class HealthMonitor {
  constructor() {
    this.services = new Map()
  }

  /**
   * 注册服务
   */
  registerService(name, healthCheck) {
    this.services.set(name, {
      name,
      healthCheck,
      status: 'unknown',
      lastCheck: null,
      consecutiveFailures: 0,
      totalChecks: 0,
      totalSuccesses: 0
    })
  }

  /**
   * 检查单个服务健康状态
   */
  async checkService(name) {
    const service = this.services.get(name)
    if (!service) {
      throw new Error(`服务 ${name} 未注册`)
    }

    try {
      service.totalChecks++
      const result = await service.healthCheck()
      service.status = 'healthy'
      service.lastCheck = new Date().toISOString()
      service.consecutiveFailures = 0
      service.totalSuccesses++
      return { name, status: 'healthy', result }
    } catch (error) {
      service.status = 'unhealthy'
      service.lastCheck = new Date().toISOString()
      service.consecutiveFailures++
      service.lastError = error.message
      return { name, status: 'unhealthy', error: error.message }
    }
  }

  /**
   * 检查所有服务健康状态
   */
  async checkAllServices() {
    const results = []
    const promises = Array.from(this.services.keys()).map(name => 
      this.checkService(name).catch(error => ({
        name,
        status: 'error',
        error: error.message
      }))
    )

    const settledResults = await Promise.allSettled(promises)
    
    settledResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      }
    })

    return {
      overall: results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded',
      services: results,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 获取服务统计信息
   */
  getServiceStats() {
    const stats = {}
    for (const [name, service] of this.services) {
      stats[name] = {
        status: service.status,
        lastCheck: service.lastCheck,
        consecutiveFailures: service.consecutiveFailures,
        successRate: service.totalChecks > 0 ? 
          (service.totalSuccesses / service.totalChecks * 100).toFixed(2) + '%' : 'N/A'
      }
    }
    return stats
  }
}

// 创建全局实例
export const deepseekCircuitBreaker = new CircuitBreaker({
  name: 'DeepSeekAPI',
  failureThreshold: 3,
  resetTimeout: 30000 // 30秒
})

export const deepseekRetryHandler = new RetryHandler({
  maxRetries: 2,
  baseDelay: 1000,
  maxDelay: 5000
})

export const healthMonitor = new HealthMonitor()