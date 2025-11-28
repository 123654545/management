import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const loading = ref(false)

  // 计算属性
  const isAuthenticated = computed(() => !!token.value && !!user.value)

  // 方法
  const login = async (email, password) => {
    try {
      loading.value = true
      const response = await authApi.login(email, password)
      
      // 保存token和用户信息
      // 检查response结构，处理可能的嵌套情况
      const tokenValue = response.token || (response.data && response.data.token)
      const userValue = response.user || (response.data && response.data.user)
      
      if (!tokenValue || !userValue) {
        throw new Error('无效的响应格式')
      }
      
      token.value = tokenValue
      user.value = userValue
      localStorage.setItem('token', tokenValue)
      localStorage.setItem('user', JSON.stringify(userValue))
      
      return response
    } catch (error) {
      console.error('登录失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const register = async (email, password) => {
    try {
      const response = await authApi.register(email, password)
      return response
    } catch (error) {
      throw error
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  const getUserInfo = async () => {
    try {
      const userInfo = await authApi.getUserInfo()
      user.value = userInfo
      return userInfo
    } catch (error) {
      throw error
    }
  }

  const updateProfile = async (data) => {
    try {
      loading.value = true
      const updatedUser = await authApi.updateProfile(data)
      user.value = updatedUser
      return updatedUser
    } catch (error) {
      throw error
    } finally {
      loading.value = false
    }
  }

  // 发送重置密码邮件
  const forgotPassword = async (email) => {
    try {
      loading.value = true
      return await authApi.forgotPassword(email)
    } catch (error) {
      throw error
    } finally {
      loading.value = false
    }
  }

  // 重置密码
  const resetPassword = async (token, newPassword) => {
    try {
      loading.value = true
      return await authApi.resetPassword(token, newPassword)
    } catch (error) {
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    // 状态
    user,
    token,
    loading,
    // 计算属性
    isAuthenticated,
    // 方法
    login,
    register,
    logout,
    getUserInfo,
    updateProfile,
    forgotPassword,
    resetPassword
  }
})