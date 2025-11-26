import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '../config/database.js'
import nodemailer from 'nodemailer'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || 'reset-token-secret'

// 配置邮件发送器
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'user@example.com',
    pass: process.env.SMTP_PASS || 'password'
  }
})

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
    const { data: existingUser, error: checkError } = await supabaseAdmin
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
    const { data: user, error } = await supabaseAdmin
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
    const { data: user, error } = await supabaseAdmin
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
    const { data: user, error } = await supabaseAdmin
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

// 发送重置密码邮件
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    
    // 验证邮箱格式
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: '邮箱格式不正确' })
    }
    
    // 检查用户是否存在
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()
    
    if (error || !user) {
      // 即使邮箱不存在，也返回成功消息，避免信息泄露
      return res.json({ success: true, message: '如果邮箱存在，重置链接已发送' })
    }
    
    // 生成重置令牌
    const resetToken = jwt.sign(
      { userId: user.id, email },
      RESET_TOKEN_SECRET,
      { expiresIn: '1h' }
    )
    
    // 构建重置链接
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?token=${resetToken}`
    
    // 发送邮件
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@example.com',
      to: email,
      subject: '密码重置请求',
      html: `
        <h2>重置您的密码</h2>
        <p>点击下面的链接重置您的密码：</p>
        <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">重置密码</a>
        <p>此链接将在1小时后过期。</p>
        <p>如果您没有请求重置密码，请忽略此邮件。</p>
      `
    })
    
    res.json({ success: true, message: '重置链接已发送到您的邮箱' })
  } catch (error) {
    console.error('发送重置邮件失败:', error)
    res.status(500).json({ success: false, message: '服务器错误，无法发送重置邮件' })
  }
})

// 验证重置令牌
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body
    
    if (!token) {
      return res.status(400).json({ success: false, message: '令牌不能为空' })
    }
    
    try {
      const decoded = jwt.verify(token, RESET_TOKEN_SECRET)
      res.json({ success: true, message: '令牌有效', userId: decoded.userId })
    } catch (error) {
      res.status(400).json({ success: false, message: '无效或过期的令牌' })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

// 重置密码
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body
    
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: '令牌和新密码不能为空' })
    }
    
    // 验证密码强度
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: '密码长度至少为8位' })
    }
    
    // 验证令牌
    let decoded
    try {
      decoded = jwt.verify(token, RESET_TOKEN_SECRET)
    } catch (error) {
      return res.status(400).json({ success: false, message: '无效或过期的令牌' })
    }
    
    // 加密新密码
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)
    
    // 更新密码
    const { error } = await supabaseAdmin
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', decoded.userId)
    
    if (error) {
      throw error
    }
    
    res.json({ success: true, message: '密码重置成功' })
  } catch (error) {
    console.error('重置密码失败:', error)
    res.status(500).json({ success: false, message: '服务器错误，无法重置密码' })
  }
})

export default router