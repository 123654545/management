import pdf from 'pdf-parse'
import mammoth from 'mammoth'
import fs from 'fs'

/**
 * 从 PDF 文件提取文本
 */
export const extractFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdf(dataBuffer)
    return {
      text: data.text,
      pages: data.numpages,
      info: data.info
    }
  } catch (error) {
    throw new Error(`PDF 解析失败: ${error.message}`)
  }
}

/**
 * 从 DOCX 文件提取文本
 */
export const extractFromDOCX = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath })
    return {
      text: result.value,
      pages: 1, // DOCX 不提供页数信息
      info: {}
    }
  } catch (error) {
    throw new Error(`DOCX 解析失败: ${error.message}`)
  }
}

/**
 * 根据文件类型提取文本
 */
export const extractText = async (filePath, fileType) => {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return await extractFromPDF(filePath)
    case 'docx':
      return await extractFromDOCX(filePath)
    default:
      throw new Error(`不支持的文件类型: ${fileType}`)
  }
}

/**
 * 获取文件信息
 */
export const getFileInfo = (file) => {
  const ext = file.originalname.split('.').pop().toLowerCase()
  return {
    originalName: file.originalname,
    fileName: file.filename,
    filePath: file.path,
    fileType: ext,
    fileSize: file.size,
    mimeType: file.mimetype
  }
}