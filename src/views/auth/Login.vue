<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>智能合同管理系统</h1>
        <p>AI驱动的合同智能分析平台</p>
      </div>

      <!-- 登录表单 -->
      <el-form
        v-if="!showForgotPassword && !showResetPassword"
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        size="large"
      >
        <el-form-item prop="email">
          <el-input
            v-model="loginForm.email"
            placeholder="请输入邮箱"
            prefix-icon="Message"
            type="email"
            clearable
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            type="password"
            show-password
            clearable
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            class="login-button"
            :loading="userStore.loading"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>

        <div class="login-footer">
          <div class="forgot-password">
            <el-link type="primary" @click="showForgotPassword = true">
              忘记密码？
            </el-link>
          </div>
          <div class="register-link">
            <span>还没有账号？</span>
            <el-link type="primary" @click="$router.push('/register')">
              立即注册
            </el-link>
          </div>
        </div>
      </el-form>

      <!-- 忘记密码表单 -->
      <el-form
        v-if="showForgotPassword"
        ref="forgotFormRef"
        :model="forgotForm"
        :rules="forgotRules"
        class="login-form"
        size="large"
      >
        <div class="form-header">
          <h2>重置密码</h2>
          <p>请输入您的邮箱，我们将发送重置密码的链接</p>
        </div>

        <el-form-item prop="email">
          <el-input
            v-model="forgotForm.email"
            placeholder="请输入邮箱"
            prefix-icon="Message"
            type="email"
            clearable
            @keyup.enter="handleForgotPassword"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            class="login-button"
            :loading="userStore.loading"
            @click="handleForgotPassword"
          >
            发送重置链接
          </el-button>
        </el-form-item>

        <div class="login-footer">
          <el-link type="primary" @click="showForgotPassword = false">
            返回登录
          </el-link>
        </div>
      </el-form>

      <!-- 重置密码表单 -->
      <el-form
        v-if="showResetPassword"
        ref="resetFormRef"
        :model="resetForm"
        :rules="resetRules"
        class="login-form"
        size="large"
      >
        <div class="form-header">
          <h2>设置新密码</h2>
          <p>请设置您的新密码</p>
        </div>

        <el-form-item prop="newPassword">
          <el-input
            v-model="resetForm.newPassword"
            placeholder="请输入新密码（至少8位，包含字母和数字）"
            prefix-icon="Lock"
            type="password"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input
            v-model="resetForm.confirmPassword"
            placeholder="请确认新密码"
            prefix-icon="Lock"
            type="password"
            show-password
            clearable
            @keyup.enter="handleResetPassword"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            class="login-button"
            :loading="userStore.loading"
            @click="handleResetPassword"
          >
            重置密码
          </el-button>
        </el-form-item>

        <div class="login-footer">
          <el-link type="primary" @click="showResetPassword = false; showForgotPassword = false">
            返回登录
          </el-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { validateEmail, validatePassword, validateConfirmPassword } from '@/utils/validation'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 登录表单
const loginFormRef = ref()
const loginForm = reactive({
  email: '',
  password: ''
})

// 忘记密码表单
const forgotFormRef = ref()
const forgotForm = reactive({
  email: ''
})

// 重置密码表单
const resetFormRef = ref()
const resetForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

// UI状态
const showForgotPassword = ref(false)
const showResetPassword = ref(false)

// 表单验证规则
const loginRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { validator: (rule, value, callback) => {
      if (!validateEmail(value)) {
        callback(new Error('邮箱格式不正确'))
      } else {
        callback()
      }
    }, trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, message: '密码长度至少8位', trigger: 'blur' }
  ]
}

const forgotRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { validator: (rule, value, callback) => {
      if (!validateEmail(value)) {
        callback(new Error('邮箱格式不正确'))
      } else {
        callback()
      }
    }, trigger: 'blur' }
  ]
}

const resetRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { validator: (rule, value, callback) => {
      const result = validatePassword(value)
      if (!result.valid) {
        callback(new Error(result.message))
      } else {
        callback()
      }
    }, trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: (rule, value, callback) => {
      const result = validateConfirmPassword(resetForm.newPassword, value)
      if (!result.valid) {
        callback(new Error(result.message))
      } else {
        callback()
      }
    }, trigger: 'blur' }
  ]
}

// 组件挂载时检查URL参数
onMounted(() => {
  const token = route.query.token
  if (token) {
    // 从URL获取token，显示重置密码表单
    resetForm.token = token
    showResetPassword.value = true
  }
})

const handleLogin = async () => {
  if (!loginFormRef.value) return

  try {
    await loginFormRef.value.validate()
    
    await userStore.login(loginForm.email, loginForm.password)
    
    ElMessage.success('登录成功')
    
    // 跳转到目标页面或首页
    const redirect = route.query.redirect
    router.push(redirect || '/dashboard')
  } catch (error) {
    console.error('登录失败:', error)
  }
}

const handleForgotPassword = async () => {
  if (!forgotFormRef.value) return

  try {
    await forgotFormRef.value.validate()
    
    await userStore.forgotPassword(forgotForm.email)
    
    ElMessage.success('重置密码邮件已发送，请查收')
    showForgotPassword.value = false
    
    // 清空表单
    forgotForm.email = ''
  } catch (error) {
    console.error('发送重置邮件失败:', error)
  }
}

const handleResetPassword = async () => {
  if (!resetFormRef.value) return

  try {
    await resetFormRef.value.validate()
    
    const token = resetForm.token || route.query.token
    await userStore.resetPassword(token, resetForm.newPassword)
    
    ElMessage.success('密码重置成功，请登录')
    
    // 重置状态
    showResetPassword.value = false
    showForgotPassword.value = false
    
    // 清空表单
    resetForm.newPassword = ''
    resetForm.confirmPassword = ''
  } catch (error) {
    console.error('密码重置失败:', error)
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-header h1 {
  font-size: 28px;
  color: #2c3e50;
  margin-bottom: 8px;
  font-weight: 600;
}

.login-header p {
  color: #7f8c8d;
  font-size: 14px;
}

.login-form {
  width: 100%;
}

.login-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
}

.login-footer {
  margin-top: 24px;
  font-size: 14px;
  color: #7f8c8d;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.forgot-password {
  text-align: left;
}

.register-link {
  text-align: right;
}

.login-footer .el-link {
  margin-left: 4px;
}

.form-header {
  text-align: center;
  margin-bottom: 24px;
}

.form-header h2 {
  font-size: 22px;
  color: #2c3e50;
  margin-bottom: 8px;
  font-weight: 600;
}

.form-header p {
  color: #7f8c8d;
  font-size: 14px;
}
</style>