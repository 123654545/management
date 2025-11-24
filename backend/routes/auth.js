import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '../config/database.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

/**
 * 用户注册
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body

    // 输入验证
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '请填写完整信息'
      })
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '邮箱格式不正确'
      })
    }

    // 密码验证
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少为8位'
      })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '两次输入的密码不一致'
      })
    }

    // 检查邮箱是否已注册
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle()  // 使用 maybeSingle 避免用户不存在时的错误

    if (checkError && checkError.code !== 'PGRST116') {
      return res.status(500).json({
        success: false,
        message: '检查邮箱时出错'
      })
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '该邮箱已被注册'
      })
    }

    // 加密密码
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // 创建用户
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({
        success: false,
        message: '注册失败，请稍后重试'
      })
    }

    // 生成 JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: {
          id: user.id,
          email: user.email
        },
        token
      }
    })
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 用户登录
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // 输入验证
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '请填写邮箱和密码'
      })
    }

    // 查找用户
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash')
      .eq('email', email)
      .maybeSingle()  // 使用 maybeSingle 避免用户不存在时的错误

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      })
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      })
    }

    // 生成 JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          email: user.email
        },
        token
      }
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 验证令牌
 */
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    
    // 验证用户是否存在
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', decoded.userId)
      .single()

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      })
    }

    res.json({
      success: true,
      message: '令牌有效',
      data: { user }
    })
  } catch (error) {
    res.status(401).json({
      success: false,
      message: '令牌无效'
    })
  }
})

export default router