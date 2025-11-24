import multer from 'multer'
import path from 'path'
import fs from 'fs'

// 确保上传目录存在
const uploadDir = './uploads'
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userUploadDir = path.join(uploadDir, req.user?.id || 'anonymous')
    if (!fs.existsSync(userUploadDir)) {
      fs.mkdirSync(userUploadDir, { recursive: true })
    }
    cb(null, userUploadDir)
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    const name = path.basename(file.originalname, ext)
    cb(null, `${name}-${uniqueSuffix}${ext}`)
  }
})

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.docx']
  const fileExt = path.extname(file.originalname).toLowerCase()
  
  if (allowedTypes.includes(fileExt)) {
    cb(null, true)
  } else {
    cb(new Error('不支持的文件类型，仅支持 PDF 和 DOCX 文件'), false)
  }
}

// 创建上传中间件
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 20 * 1024 * 1024 // 20MB
  },
  fileFilter: fileFilter
})

// 单文件上传中间件
export const uploadSingle = upload.single('file')