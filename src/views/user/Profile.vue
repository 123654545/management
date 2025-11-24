<template>
  <div class="profile-container">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <h2>个人资料</h2>
        </div>
      </template>

      <el-form
        ref="profileFormRef"
        :model="profileForm"
        :rules="profileRules"
        label-width="100px"
        size="large"
      >
        <el-form-item label="邮箱">
          <el-input
            v-model="profileForm.email"
            disabled
            placeholder="邮箱地址"
          />
        </el-form-item>

        <el-form-item label="注册时间">
          <el-input
            :value="formatDate(userStore.user?.created_at)"
            disabled
            placeholder="注册时间"
          />
        </el-form-item>

        <el-divider content-position="left">修改密码</el-divider>

        <el-form-item label="当前密码" prop="oldPassword">
          <el-input
            v-model="profileForm.oldPassword"
            type="password"
            placeholder="请输入当前密码"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="profileForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少8位，包含字母和数字）"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="profileForm.confirmPassword"
            type="password"
            placeholder="请确认新密码"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            @click="handleChangePassword"
          >
            修改密码
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { authApi } from '@/api/auth'
import { formatDate } from '@/utils/date'
import { validatePassword, validateConfirmPassword } from '@/utils/validation'

const userStore = useUserStore()
const profileFormRef = ref()
const loading = ref(false)

const profileForm = reactive({
  email: '',
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const profileRules = {
  oldPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
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
      const result = validateConfirmPassword(profileForm.newPassword, value)
      if (!result.valid) {
        callback(new Error(result.message))
      } else {
        callback()
      }
    }, trigger: 'blur' }
  ]
}

onMounted(() => {
  profileForm.email = userStore.user?.email || ''
})

const handleChangePassword = async () => {
  if (!profileFormRef.value) return

  try {
    await profileFormRef.value.validate()
    
    loading.value = true
    await authApi.changePassword(profileForm.oldPassword, profileForm.newPassword)
    
    ElMessage.success('密码修改成功')
    resetForm()
  } catch (error) {
    console.error('密码修改失败:', error)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  profileForm.oldPassword = ''
  profileForm.newPassword = ''
  profileForm.confirmPassword = ''
  profileFormRef.value?.clearValidate()
}
</script>

<style scoped>
.profile-container {
  max-width: 600px;
  margin: 20px auto;
  padding: 0 20px;
}

.profile-card {
  border-radius: 12px;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

:deep(.el-divider__text) {
  background-color: #fafafa;
}
</style>