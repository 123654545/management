/**
 * 邮箱格式验证
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 密码强度验证
 */
export const validatePassword = (password) => {
  if (password.length < 8) {
    return { valid: false, message: '密码长度至少8位' }
  }
  
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
    return { valid: false, message: '密码必须包含字母和数字' }
  }
  
  return { valid: true }
}

/**
 * 确认密码验证
 */
export const validateConfirmPassword = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return { valid: false, message: '两次输入的密码不一致' }
  }
  
  return { valid: true }
}

/**
 * 文件类型验证
 */
export const validateFileType = (file) => {
  const supportedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  
  if (!supportedTypes.includes(file.type)) {
    return { valid: false, message: '仅支持PDF和Word(.docx)文件' }
  }
  
  return { valid: true }
}

/**
 * 文件大小验证
 */
export const validateFileSize = (file, maxSize = 20 * 1024 * 1024) => {
  if (file.size > maxSize) {
    return { valid: false, message: `文件大小不能超过${Math.round(maxSize / 1024 / 1024)}MB` }
  }
  
  return { valid: true }
}

/**
 * 合同标题验证
 */
export const validateContractTitle = (title) => {
  if (!title.trim()) {
    return { valid: false, message: '合同标题不能为空' }
  }
  
  if (title.length > 200) {
    return { valid: false, message: '合同标题不能超过200个字符' }
  }
  
  return { valid: true }
}

/**
 * 日期格式验证
 */
export const validateDateFormat = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) {
    return false
  }
  
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}