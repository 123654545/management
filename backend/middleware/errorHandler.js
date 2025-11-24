/**
 * 错误处理中间件
 * 统一处理各种类型的错误
 */

/**
 * 自定义错误类
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
    
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, 'VALIDATION_ERROR')
    this.field = field
  }
}

export class NotFoundError extends AppError {
  constructor(resource = '资源') {
    super(`${resource}不存在`, 404, 'NOT_FOUND')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '未授权访问') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '禁止访问') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class RateLimitError extends AppError {
  constructor(message = '请求过于频繁') {
    super(message, 429, 'RATE_LIMIT')
  }
}

export class ExternalServiceError extends AppError {
  constructor(service, message) {
    super(`${service}服务错误: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR')
    this.service = service
  }
}

/**
 * 错误处理中间件
 */
export const errorHandler = (error, req, res, next) => {
  let err = { ...error }
  err.message = error.message

  // 记录错误日志
  console.error('错误详情:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user?.id,
    timestamp: new Date().toISOString()
  })

  // 默认错误响应
  let defaultResponse = {
    success: false,
    message: '服务器内部错误',
    code: 'INTERNAL_ERROR'
  }

  // 处理不同类型的错误
  if (error.name === 'ValidationError') {
    defaultResponse = {
      success: false,
      message: error.message,
      code: 'VALIDATION_ERROR',
      field: error.field
    }
    err.statusCode = 400
  } else if (error.name === 'CastError') {
    defaultResponse = {
      success: false,
      message: '资源ID格式错误',
      code: 'INVALID_ID'
    }
    err.statusCode = 400
  } else if (error.code === 11000) {
    // MongoDB重复键错误
    const field = Object.keys(error.keyValue)[0]
    defaultResponse = {
      success: false,
      message: `${field}已存在`,
      code: 'DUPLICATE_FIELD',
      field
    }
    err.statusCode = 400
  } else if (error.code === 'LIMIT_FILE_SIZE') {
    defaultResponse = {
      success: false,
      message: '文件大小超出限制',
      code: 'FILE_TOO_LARGE'
    }
    err.statusCode = 400
  } else if (error.code === 'LIMIT_FILE_COUNT') {
    defaultResponse = {
      success: false,
      message: '文件数量超出限制',
      code: 'TOO_MANY_FILES'
    }
    err.statusCode = 400
  } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    defaultResponse = {
      success: false,
      message: '不支持的文件字段',
      code: 'INVALID_FILE_FIELD'
    }
    err.statusCode = 400
  } else if (error instanceof AppError) {
    defaultResponse = {
      success: false,
      message: error.message,
      code: error.code,
      ...(error.field && { field: error.field }),
      ...(error.service && { service: error.service })
    }
    err.statusCode = error.statusCode
  } else if (error.name === 'JsonWebTokenError') {
    defaultResponse = {
      success: false,
      message: '无效的认证令牌',
      code: 'INVALID_TOKEN'
    }
    err.statusCode = 401
  } else if (error.name === 'TokenExpiredError') {
    defaultResponse = {
      success: false,
      message: '认证令牌已过期',
      code: 'TOKEN_EXPIRED'
    }
    err.statusCode = 401
  } else if (error.name === 'MulterError') {
    // Multer文件上传错误
    const multerErrors = {
      'LIMIT_PART_COUNT': '表单部分数量超出限制',
      'LIMIT_FILE_SIZE': '文件大小超出限制',
      'LIMIT_FILE_COUNT': '文件数量超出限制',
      'LIMIT_FIELD_KEY': '字段名称过长',
      'LIMIT_FIELD_VALUE': '字段值过长',
      'LIMIT_FIELD_COUNT': '字段数量超出限制',
      'LIMIT_UNEXPECTED_FILE': '不支持的文件字段'
    }
    
    defaultResponse = {
      success: false,
      message: multerErrors[error.code] || '文件上传错误',
      code: 'UPLOAD_ERROR',
      multerCode: error.code
    }
    err.statusCode = 400
  }

  // 开发环境返回详细错误信息
  if (process.env.NODE_ENV === 'development') {
    defaultResponse.stack = error.stack
    defaultResponse.originalError = error
  }

  res.status(err.statusCode || 500).json(defaultResponse)
}

/**
 * 异步错误捕获包装器
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * 404错误处理
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    code: 'NOT_FOUND',
    path: req.originalUrl
  })
}

/**
 * 安全信息过滤器 - 避免泄露敏感信息
 */
export const sanitizeError = (error, isProduction = false) => {
  const sanitized = {
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR'
  }

  // 生产环境不返回详细错误信息和堆栈
  if (!isProduction) {
    sanitized.stack = error.stack
    sanitized.details = error
  }

  return sanitized
}