import request from './request'

export const authApi = {
  // 用户登录 - 使用自定义后端
  login: async (email, password) => {
    try {
      const response = await request.post('/auth/login', { email, password })
      
      // 直接返回响应数据，localStorage处理交给store层
      return response
    } catch (error) {
      throw error
    }
  },

  // 用户注册 - 使用自定义后端
  register: async (email, password) => {
    try {
      const response = await request.post('/auth/register', { 
        email, 
        password, 
        confirmPassword: password 
      })
      
      // 直接返回响应数据，localStorage处理交给store层
      return response
    } catch (error) {
      throw error
    }
  },

  // 获取用户信息 - 使用自定义后端
  getUserInfo: async () => {
    try {
      const response = await request.get('/auth/verify')
      // 根据修改后的响应拦截器，直接返回响应数据
      // 确保返回的是用户对象
      if (response && response.user) {
        return response.user
      }
      return response
    } catch (error) {
      throw error
    }
  },

  // 用户登出 - 使用自定义后端
  logout: async () => {
    try {
      // 可以选择调用后端登出接口，或者直接清除本地存储
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } catch (error) {
      // 即使登出失败，也清除本地存储
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  },

  // 更新用户资料 - 保留原有逻辑
  updateProfile: async (data) => {
    return request.put('/auth/profile', data)
  },

  // 修改密码 - 保留原有逻辑
  changePassword: async (oldPassword, newPassword) => {
    return request.post('/auth/change-password', { oldPassword, newPassword })
  },

  // 发送重置密码邮件
  forgotPassword: async (email) => {
    return request.post('/auth/forgot-password', { email })
  },

  // 验证重置密码令牌
  verifyResetToken: async (token) => {
    return request.post('/auth/verify-reset-token', { token })
  },

  // 重置密码
  resetPassword: async (token, newPassword) => {
    return request.post('/auth/reset-password', { token, newPassword })
  }
}