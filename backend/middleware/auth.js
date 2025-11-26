import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '../config/database.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// 验证 JWT Token
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问被拒绝，需要提供认证令牌'
      })
    }

    // 验证 JWT
    const decoded = jwt.verify(token, JWT_SECRET)
    
    // 验证用户是否存在于数据库
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', decoded.userId)
      .single()

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在或令牌无效'
      })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '令牌已过期，请重新登录'
      })
    }
    
    return res.status(403).json({
      success: false,
      message: '令牌无效'
    })
  }
}

// 可选的身份验证（不强制要求登录）
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      req.user = null
      return next()
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', decoded.userId)
      .single()

    if (!error && user) {
      req.user = user
    } else {
      req.user = null
    }

    next()
  } catch (error) {
    req.user = null
    next()
  }
}