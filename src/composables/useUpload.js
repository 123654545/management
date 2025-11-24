import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { validateFileType, validateFileSize } from '@/utils/validation'

export const useUpload = (options = {}) => {
  const uploading = ref(false)
  const progress = ref(0)

  const validateFile = (file) => {
    const typeValidation = validateFileType(file)
    if (!typeValidation.valid) {
      ElMessage.error(typeValidation.message)
      return false
    }

    const sizeValidation = validateFileSize(file, options.maxSize)
    if (!sizeValidation.valid) {
      ElMessage.error(sizeValidation.message)
      return false
    }

    return true
  }

  const uploadFile = async (
    uploadFn,
    file
  ) => {
    if (!validateFile(file)) {
      throw new Error('文件验证失败')
    }

    try {
      uploading.value = true
      progress.value = 0

      const result = await uploadFn(file, (p) => {
        progress.value = p
      })

      ElMessage.success('文件上传成功')
      options.onSuccess?.(file)
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败'
      ElMessage.error(errorMessage)
      options.onError?.(error instanceof Error ? error : new Error(errorMessage))
      throw error
    } finally {
      uploading.value = false
      progress.value = 0
    }
  }

  return {
    uploading,
    progress,
    uploadFile,
    validateFile
  }
}