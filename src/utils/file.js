/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * 获取文件扩展名
 */
export const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase()
}

/**
 * 检查文件类型是否支持
 */
export const isSupportedFileType = (file) => {
  const supportedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  return supportedTypes.includes(file.type)
}

/**
 * 检查文件大小是否超过限制
 */
export const isFileSizeValid = (file, maxSize = 20 * 1024 * 1024) => {
  return file.size <= maxSize
}

/**
 * 获取文件类型图标
 */
export const getFileIcon = (filename) => {
  const ext = getFileExtension(filename)
  
  switch (ext) {
    case 'pdf':
      return 'Document'
    case 'docx':
      return 'Document'
    case 'doc':
      return 'Document'
    default:
      return 'Document'
  }
}

/**
 * 下载文件
 */
export const downloadFile = async (url, filename) => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    console.error('下载文件失败:', error)
    throw error
  }
}

/**
 * 创建下载链接
 */
export const createDownloadLink = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
  
  return filename
}