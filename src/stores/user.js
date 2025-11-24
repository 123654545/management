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
      
      // 保存token
      token.value = response.token
      localStorage.setItem('token', response.token)
      
      // 获取用户信息
      await getUserInfo()
      
      return response
    } catch (error) {
      throw error
    } finally {
      loading.value = false
    }
  }

  const register = async (email, password) => {
    try {
      loading.value = true
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
    updateProfile
  }
})