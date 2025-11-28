import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// 创建axios实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 添加token到请求头
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { data } = response
    
    // 对于2xx响应，我们默认它是成功的
    // 处理可能的响应格式差异
    if (typeof data === 'object' && data !== null) {
      // 如果有success字段且为false，则认为请求失败
      if ('success' in data && !data.success) {
        ElMessage.error(data.message || '请求失败')
        return Promise.reject(new Error(data.message || '请求失败'))
      }
      
      // 根据不同的API格式返回合适的数据
      // 兼容常见的响应格式
      if (data.data) {
        return data.data
      } else if (data.token || data.user) {
        // 对于认证相关响应，保留原始结构
        return data
      }
    }
    
    // 返回原始响应数据
    return data
  },
  (error) => {
    // 处理网络错误
    if (!error.response) {
      ElMessage.error('网络连接失败，请检查网络设置')
      return Promise.reject(error)
    }
    
    const { status, data } = error.response
    
    switch (status) {
      case 401:
        // 未授权，清除token并跳转登录页
        localStorage.removeItem('token')
        ElMessage.error('登录已过期，请重新登录')
        router.push({
          name: 'Login',
          query: { redirect: router.currentRoute.value.fullPath }
        })
        break
      case 403:
        ElMessage.error('没有权限访问该资源')
        break
      case 404:
        ElMessage.error('请求的资源不存在')
        break
      case 400:
        // 请求参数错误
      case 422:
        // 表单验证错误
        const errorMessage = data?.message || '请求参数有误'
        ElMessage.error(errorMessage)
        break
      case 500:
        ElMessage.error('服务器内部错误，请稍后重试')
        break
      default:
        ElMessage.error(data?.message || '请求失败')
    }
    
    return Promise.reject(error)
  }
)

export default request