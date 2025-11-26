// 测试上传功能的各个步骤
import express from 'express'
import multer from 'multer'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

// 配置上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
})

// 测试上传
app.post('/test-upload', upload.single('file'), (req, res) => {
  try {
    console.log('=== 测试上传开始 ===')
    console.log('Body:', req.body)
    console.log('File:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer ? `Buffer (${req.file.buffer.length} bytes)` : 'No buffer'
    } : 'No file')
    
    res.json({ 
      success: true, 
      message: '测试上传成功',
      body: req.body,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    })
  } catch (error) {
    console.error('测试上传错误:', error)
    res.status(500).json({ 
      success: false, 
      message: '测试上传失败',
      error: error.message 
    })
  }
})

const PORT = 5001
app.listen(PORT, () => {
  console.log(`测试服务器运行在 http://localhost:${PORT}`)
  console.log('测试方法:')
  console.log('curl -X POST -F "name=测试模板" -F "category=other" -F "description=测试描述" -F "file=@test.txt" http://localhost:5001/test-upload')
})