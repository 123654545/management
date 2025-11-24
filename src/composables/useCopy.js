import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export const useCopy = () => {
  const copying = ref(false)

  const copyToClipboard = async (text) => {
    try {
      copying.value = true

      // 尝试使用现代的Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        // 降级到传统方法
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        const success = document.execCommand('copy')
        document.body.removeChild(textArea)
        
        if (!success) {
          throw new Error('复制失败')
        }
      }

      ElMessage.success('已复制到剪贴板')
      return true
    } catch (error) {
      ElMessage.error('复制失败，请手动复制')
      return false
    } finally {
      copying.value = false
    }
  }

  return {
    copying,
    copyToClipboard
  }
}