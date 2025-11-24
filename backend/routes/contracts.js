import express from 'express'
import multer from 'multer'
import { authenticateToken } from '../middleware/auth.js'
import { uploadSingle } from '../utils/fileUpload.js'
import { extractText, getFileInfo } from '../utils/textExtraction.js'
import { supabase, supabaseAdmin } from '../config/database.js'

const router = express.Router()

/**
 * 获取用户合同列表
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'uploaded_at', sortOrder = 'desc' } = req.query

    const { data: contracts, error } = await supabaseAdmin
      .from('contracts')
      .select(`
        *,
        contract_analyses (
          analysis_status,
          key_terms,
          risk_points,
          key_dates
        )
      `)
      .eq('user_id', req.user.id)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      return res.status(500).json({
        success: false,
        message: '获取合同列表失败'
      })
    }

    // 获取总数
    const { count } = await supabaseAdmin
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)

    res.json({
      success: true,
      data: {
        contracts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    })
  } catch (error) {
    console.error('获取合同列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 获取单个合同详情
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`
        *,
        contract_analyses (*)
      `)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single()

    if (error || !contract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在'
      })
    }

    res.json({
      success: true,
      data: contract
    })
  } catch (error) {
    console.error('获取合同详情错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 上传合同文件
 */
router.post('/upload', authenticateToken, (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer错误（文件大小等）
      return res.status(400).json({
        success: false,
        message: err.message || '文件上传错误'
      })
    } else if (err) {
      // 其他错误（文件类型等）
      return res.status(400).json({
        success: false,
        message: err.message || '文件验证失败'
      })
    }
    next()
  })
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      })
    }

    // 获取文件信息
    const fileInfo = getFileInfo(req.file)

    // 提取文本
    let extractedText = ''
    try {
      const extraction = await extractText(req.file.path, fileInfo.fileType)
      extractedText = extraction.text
    } catch (error) {
      console.warn('文本提取失败:', error.message)
      // 即使文本提取失败，也继续保存文件
    }

    // 保存合同信息到数据库
    const { data: contract, error } = await supabaseAdmin
      .from('contracts')
      .insert({
        user_id: req.user.id,
        file_name: Buffer.from(fileInfo.originalName, 'latin1').toString('utf8'),
        file_url: req.file.path,
        title: Buffer.from(fileInfo.originalName.replace(/\.[^/.]+$/, ""), 'latin1').toString('utf8'),
        file_type: fileInfo.fileType,
        file_size: fileInfo.fileSize,
        extracted_text: extractedText
      })
      .select()
      .single()

    if (error) {
      console.error('数据库插入错误:', error)
      return res.status(500).json({
        success: false,
        message: '保存合同信息失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }

    // 创建分析记录
    const { error: analysisError } = await supabaseAdmin
      .from('contract_analyses')
      .insert({
        contract_id: contract.id,
        analysis_status: extractedText ? 'pending' : 'failed',
        error_message: extractedText ? null : '无法提取文件文本内容'
      })

    if (analysisError) {
      console.warn('创建分析记录失败:', analysisError.message)
    }

    res.status(201).json({
      success: true,
      message: '合同上传成功',
      data: contract
    })
  } catch (error) {
    console.error('合同上传错误:', error)
    res.status(500).json({
      success: false,
      message: error.message || '服务器错误'
    })
  }
})

/**
 * 更新合同信息
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { title } = req.body

    const { data: contract, error } = await supabase
      .from('contracts')
      .update({
        title,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single()

    if (error || !contract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在或更新失败'
      })
    }

    res.json({
      success: true,
      message: '合同更新成功',
      data: contract
    })
  } catch (error) {
    console.error('更新合同错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 删除合同
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // 先获取合同信息（用于删除文件）
    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('file_url')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single()

    if (fetchError || !contract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在'
      })
    }

    // 删除数据库记录（会级联删除分析记录）
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)

    if (error) {
      return res.status(500).json({
        success: false,
        message: '删除合同失败'
      })
    }

    // 删除文件（异步操作，不等待结果）
    if (contract.file_url) {
      try {
        const fs = await import('fs/promises')
        await fs.unlink(contract.file_url)
      } catch (fileError) {
        console.warn('删除文件失败:', fileError.message)
      }
    }

    res.json({
      success: true,
      message: '合同删除成功'
    })
  } catch (error) {
    console.error('删除合同错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 下载合同文件
 */
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const { data: contract, error } = await supabase
      .from('contracts')
      .select('file_name, file_url')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single()

    if (error || !contract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在'
      })
    }

    const fs = await import('fs')
    const path = await import('path')

    if (!fs.existsSync(contract.file_url)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      })
    }

    res.download(contract.file_url, contract.file_name)
  } catch (error) {
    console.error('下载文件错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

export default router