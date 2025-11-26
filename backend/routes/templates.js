import express from 'express'
import multer from 'multer'
import { authenticateToken } from '../middleware/auth.js'
import { supabaseAdmin } from '../config/database.js'
import { extractText, getFileInfo } from '../utils/textExtraction.js'

const router = express.Router()

// 配置文件上传（使用内存存储）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件格式'), false)
    }
  }
})

/**
 * 获取模板列表
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 12,
      category,
      search,
      sortBy = 'createdAt'
    } = req.query



    let query = supabaseAdmin
      .from('templates')
      .select('*', { count: 'exact' })

    // 分类筛选
    if (category) {
      query = query.eq('category', category)
    }

    // 搜索
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // 排序
    const validSortFields = ['created_at', 'use_count', 'rating']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    query = query.order(sortField, { ascending: false })

    // 分页
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('模板查询错误:', error)
      return res.status(500).json({
        success: false,
        message: '获取模板列表失败',
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }

    res.json({
      success: true,
      data: data || [],
      total: count || 0,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    })
  } catch (error) {
    console.error('获取模板列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 获取模板详情
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !template) {
      return res.status(404).json({
        success: false,
        message: '模板不存在'
      })
    }

    // 增加使用次数
    await supabaseAdmin
      .from('templates')
      .update({ useCount: (template.useCount || 0) + 1 })
      .eq('id', id)

    res.json({
      success: true,
      data: template
    })
  } catch (error) {
    console.error('获取模板详情错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 上传模板
 */
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { name, category, description } = req.body
    const file = req.file

    console.log('上传模板参数:', { name, category, description, file: !!file })
    console.log('用户信息:', req.user)

    if (!name || !category || !description || !file) {
      return res.status(400).json({
        success: false,
        message: '请填写完整信息并上传文件',
        debug: { hasName: !!name, hasCategory: !!category, hasDescription: !!description, hasFile: !!file }
      })
    }

    // 提取文件内容（暂时使用默认内容，因为文件在内存中）
    let fileContent = '模板文件内容...'
    
    try {
      // 如果有文本提取功能的话
      if (file.buffer) {
        fileContent = `文件: ${file.originalname}
大小: ${file.size} bytes
类型: ${file.mimetype}

模板内容预览...`
      }
    } catch (error) {
      console.warn('文件内容提取失败:', error)
      fileContent = '模板内容...'
    }

    // 暂时不上传到Storage，使用空URL
    let fileUrl = null
    
    // 上传文件到Supabase Storage（可选）
    try {
      const fileName = `templates/${Date.now()}_${file.originalname}`
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('templates')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        })

      if (!uploadError) {
        // 获取文件URL
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('templates')
          .getPublicUrl(fileName)
        fileUrl = publicUrl
        console.log('文件上传成功:', fileUrl)
      } else {
        console.warn('文件上传到Storage失败:', uploadError)
      }
    } catch (storageError) {
      console.warn('Storage上传异常:', storageError)
    }

    // 保存模板信息
    console.log('准备插入模板数据:', {
      name,
      category,
      description,
      content: fileContent?.substring(0, 100) + '...',
      file_url: fileUrl,
      file_name: file.originalname,
      file_size: file.size,
      file_type: file.mimetype,
      uploaded_by: req.user.id
    })

    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .insert({
        name,
        category,
        description,
        content: fileContent,
        file_url: fileUrl,
        file_name: file.originalname,
        file_size: file.size,
        file_type: file.mimetype,
        uploaded_by: req.user.id,
        use_count: 0,
        rating: 0,
        rating_count: 0
      })
      .select()
      .single()

    if (error) {
      console.error('数据库插入错误:', error)
      
      // 删除已上传的文件（如果有的话）
      if (fileName) {
        await supabaseAdmin.storage.from('templates').remove([fileName])
      }
      
      return res.status(500).json({
        success: false,
        message: '模板保存失败',
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }

    res.status(201).json({
      success: true,
      message: '模板上传成功',
      data: template
    })
  } catch (error) {
    console.error('上传模板错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 预览模板
 */
router.get('/:id/preview', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .select('content, name')
      .eq('id', id)
      .single()

    if (error || !template) {
      return res.status(404).json({
        success: false,
        message: '模板不存在'
      })
    }

    // 简单的HTML预览
    const htmlContent = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h2>${template.name}</h2>
        <div style="white-space: pre-wrap; line-height: 1.6;">
          ${template.content}
        </div>
      </div>
    `

    res.json({
      success: true,
      data: {
        content: htmlContent
      }
    })
  } catch (error) {
    console.error('预览模板错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 使用模板创建合同
 */
router.post('/:id/use', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const contractData = req.body

    // 获取模板信息
    const { data: template, error: templateError } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('id', id)
      .single()

    if (templateError || !template) {
      return res.status(404).json({
        success: false,
        message: '模板不存在'
      })
    }

    // 创建合同
    const { data: contract, error } = await supabaseAdmin
      .from('contracts')
      .insert({
        title: contractData.title || `${template.name} - ${new Date().toLocaleDateString()}`,
        content: template.content,
        templateId: id,
        userId: req.user.id,
        status: 'draft'
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({
        success: false,
        message: '创建合同失败'
      })
    }

    // 增加模板使用次数
    await supabaseAdmin
      .from('templates')
      .update({ useCount: (template.useCount || 0) + 1 })
      .eq('id', id)

    res.status(201).json({
      success: true,
      message: '合同创建成功',
      data: contract
    })
  } catch (error) {
    console.error('使用模板错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 删除模板
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // 检查模板是否存在
    const { data: template, error: checkError } = await supabaseAdmin
      .from('templates')
      .select('fileName, uploadedBy')
      .eq('id', id)
      .single()

    if (checkError || !template) {
      return res.status(404).json({
        success: false,
        message: '模板不存在'
      })
    }

    // 检查权限（只有上传者可以删除）
    if (template.uploadedBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '没有权限删除此模板'
      })
    }

    // 删除模板记录
    const { error } = await supabaseAdmin
      .from('templates')
      .delete()
      .eq('id', id)

    if (error) {
      return res.status(500).json({
        success: false,
        message: '删除模板失败'
      })
    }

    res.json({
      success: true,
      message: '模板删除成功'
    })
  } catch (error) {
    console.error('删除模板错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 更新模板信息
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { name, category, description } = req.body

    // 检查模板是否存在和权限
    const { data: template, error: checkError } = await supabaseAdmin
      .from('templates')
      .select('uploadedBy')
      .eq('id', id)
      .single()

    if (checkError || !template) {
      return res.status(404).json({
        success: false,
        message: '模板不存在'
      })
    }

    if (template.uploadedBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '没有权限修改此模板'
      })
    }

    // 更新模板
    const { data: updatedTemplate, error } = await supabaseAdmin
      .from('templates')
      .update({
        name,
        category,
        description,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({
        success: false,
        message: '更新模板失败'
      })
    }

    res.json({
      success: true,
      message: '模板更新成功',
      data: updatedTemplate
    })
  } catch (error) {
    console.error('更新模板错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 获取模板分类
 */
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = [
      { value: 'employment', label: '劳动合同' },
      { value: 'purchase', label: '采购合同' },
      { value: 'sales', label: '销售合同' },
      { value: 'lease', label: '租赁合同' },
      { value: 'service', label: '服务合同' },
      { value: 'nda', label: '保密协议' },
      { value: 'other', label: '其他合同' }
    ]

    res.json({
      success: true,
      data: categories
    })
  } catch (error) {
    console.error('获取分类错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

/**
 * 模板评分
 */
router.post('/:id/rate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { rating } = req.body

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: '评分必须在1-5之间'
      })
    }

    // 检查模板是否存在
    const { data: template, error: checkError } = await supabaseAdmin
      .from('templates')
      .select('rating, ratingCount')
      .eq('id', id)
      .single()

    if (checkError || !template) {
      return res.status(404).json({
        success: false,
        message: '模板不存在'
      })
    }

    // 更新评分（简单计算，实际应该记录每个用户的评分）
    const currentRating = template.rating || 0
    const currentCount = template.ratingCount || 0
    const newCount = currentCount + 1
    const newRating = (currentRating * currentCount + rating) / newCount

    const { data: updatedTemplate, error } = await supabaseAdmin
      .from('templates')
      .update({
        rating: Math.round(newRating * 100) / 100,
        ratingCount: newCount
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({
        success: false,
        message: '评分失败'
      })
    }

    res.json({
      success: true,
      message: '评分成功',
      data: updatedTemplate
    })
  } catch (error) {
    console.error('评分错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误'
    })
  }
})

export default router