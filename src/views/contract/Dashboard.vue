<template>
  <div class="dashboard-container">
    <!-- 顶部导航栏 -->
    <el-header class="dashboard-header">
      <div class="header-left">
        <h1>智能合同管理系统</h1>
      </div>
      <div class="header-right">
        <el-dropdown @command="handleCommand">
          <span class="user-info">
            <el-icon><User /></el-icon>
            {{ userStore.user?.email }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人资料</el-dropdown-item>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <!-- 主要内容区 -->
    <el-main class="dashboard-main">
      <!-- 统计卡片 -->
      <div class="stats-cards">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-card class="stats-card">
              <div class="stats-content">
                <div class="stats-icon">
                  <el-icon size="32" color="#409EFF"><Document /></el-icon>
                </div>
                <div class="stats-info">
                  <div class="stats-number">{{ contractStore.contractsCount }}</div>
                  <div class="stats-label">合同总数</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stats-card">
              <div class="stats-content">
                <div class="stats-icon">
                  <el-icon size="32" color="#67C23A"><Check /></el-icon>
                </div>
                <div class="stats-info">
                  <div class="stats-number">{{ completedAnalysisCount }}</div>
                  <div class="stats-label">已分析合同</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stats-card">
              <div class="stats-content">
                <div class="stats-icon">
                  <el-icon size="32" color="#E6A23C"><Loading /></el-icon>
                </div>
                <div class="stats-info">
                  <div class="stats-number">{{ processingAnalysisCount }}</div>
                  <div class="stats-label">分析中</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stats-card">
              <div class="stats-content">
                <div class="stats-icon">
                  <el-icon size="32" color="#F56C6C"><Warning /></el-icon>
                </div>
                <div class="stats-info">
                  <div class="stats-number">{{ riskContractsCount }}</div>
                  <div class="stats-label">风险合同</div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 操作区域 -->
      <div class="actions-section">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>合同管理</span>
              <el-button
                type="primary"
                :icon="Upload"
                @click="showUploadDialog = true"
              >
                上传合同
              </el-button>
            </div>
            <div class="file-formats-notice">
              <el-icon><Document /></el-icon>
              <span>支持 PDF 和 Word (.docx) 格式，单个文件不超过 20MB</span>
            </div>
          </template>

          <!-- 合同列表 -->
          <div v-loading="contractStore.loading" class="contracts-list">
            <el-empty
              v-if="contractStore.contracts.length === 0 && !contractStore.loading"
              description="暂无合同，点击上传按钮添加第一个合同"
            />

            <el-row v-else :gutter="20">
              <el-col
                v-for="contract in contractStore.contracts.filter(c => c && c.id)"
                :key="contract.id"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="6"
              >
                <el-card
                  class="contract-card"
                  :body-style="{ padding: '20px' }"
                  shadow="hover"
                  @click="viewContract(contract.id, contract)"
                >
                  <div class="contract-header">
                    <div class="contract-icon">
                      <el-icon size="24"><Document /></el-icon>
                    </div>
                    <div class="contract-actions" @click.stop>
                      <el-dropdown @command="(command) => handleContractAction(command, contract)">
                        <el-button :icon="MoreFilled" circle size="small" />
                        <template #dropdown>
                          <el-dropdown-menu>
                            <el-dropdown-item command="edit">
                              <el-icon><Edit /></el-icon>
                              编辑标题
                            </el-dropdown-item>
                            <el-dropdown-item command="download">
                              <el-icon><Download /></el-icon>
                              下载文件
                            </el-dropdown-item>
                            <el-dropdown-item divided command="delete">
                              <el-icon><Delete /></el-icon>
                              删除合同
                            </el-dropdown-item>
                          </el-dropdown-menu>
                        </template>
                      </el-dropdown>
                    </div>
                  </div>

                  <h3 class="contract-title">{{ contract.title }}</h3>
                  <p class="contract-meta">
                    <el-icon><Clock /></el-icon>
                    {{ formatDate(contract.uploaded_at) }}
                  </p>
                  <p class="contract-meta">
                    <el-icon><Folder /></el-icon>
                    {{ contract.file_name }}
                  </p>

                  <div class="contract-status">
                    <el-tag
                      v-if="getAnalysisStatus(contract.id) === 'completed'"
                      type="success"
                      size="small"
                    >
                      已分析
                    </el-tag>
                    <el-tag
                      v-else-if="getAnalysisStatus(contract.id) === 'processing'"
                      type="warning"
                      size="small"
                    >
                      分析中
                    </el-tag>
                    <el-tag v-else type="info" size="small">
                      未分析
                    </el-tag>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-card>
      </div>
    </el-main>

    <!-- 上传对话框 -->
    <UploadDialog
      v-model="showUploadDialog"
      @success="handleUploadSuccess"
    />

    <!-- 编辑标题对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑合同标题"
      width="400px"
    >
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="合同标题">
          <el-input
            v-model="editForm.title"
            placeholder="请输入合同标题"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateTitle" :loading="contractStore.loading">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User,
  ArrowDown,
  Document,
  Check,
  Loading,
  Warning,
  Upload,
  MoreFilled,
  Edit,
  Download,
  Delete,
  Clock,
  Folder
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useContractStore } from '@/stores/contract'
import { formatDate, getRelativeTime } from '@/utils/date'
import { downloadFile } from '@/utils/file'
import UploadDialog from '@/components/UploadDialog.vue'

const router = useRouter()
const userStore = useUserStore()
const contractStore = useContractStore()

const showUploadDialog = ref(false)
const showEditDialog = ref(false)
const currentContract = ref(null)
const editForm = ref({ title: '' })

// 计算属性
const completedAnalysisCount = computed(() => {
  // 这里需要根据实际的分析状态计算
  return contractStore.contracts.length // 临时使用合同总数
})

const processingAnalysisCount = computed(() => {
  return 0 // 临时返回0，实际需要查询分析状态
})

const riskContractsCount = computed(() => {
  return 0 // 临时返回0，实际需要根据风险点计算
})

// 获取分析状态
const getAnalysisStatus = (contractId) => {
  // 这里需要根据实际的分析结果判断状态
  // 临时返回'completed'，实际需要API查询
  return 'completed'
}

// 页面初始化
onMounted(async () => {
  await contractStore.fetchContracts()
})

// 处理用户菜单命令
const handleCommand = async (command) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        userStore.logout()
        router.push('/login')
      } catch {
        // 用户取消
      }
      break
  }
}

// 查看合同详情
const viewContract = (id) => {
  router.push(`/contract/${id}`)
}

// 处理合同操作
const handleContractAction = async (command, contract) => {
  switch (command) {
    case 'edit':
      currentContract.value = contract
      editForm.value.title = contract.title
      showEditDialog.value = true
      break
    case 'download':
      try {
        await downloadFile(contract.file_url, contract.file_name)
      } catch (error) {
        ElMessage.error('下载失败')
      }
      break
    case 'delete':
      try {
        await ElMessageBox.confirm(
          `确定要删除合同"${contract.title}"吗？此操作不可恢复。`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        await contractStore.deleteContract(contract.id)
        ElMessage.success('合同删除成功')
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败')
        }
      }
      break
  }
}

// 更新合同标题
const handleUpdateTitle = async () => {
  if (!currentContract.value || !editForm.value.title.trim()) {
    ElMessage.error('请输入有效的合同标题')
    return
  }

  try {
    await contractStore.updateContract(currentContract.value.id, {
      title: editForm.value.title
    })
    ElMessage.success('标题更新成功')
    showEditDialog.value = false
  } catch (error) {
    ElMessage.error('标题更新失败')
  }
}

// 上传成功回调
const handleUploadSuccess = () => {
  showUploadDialog.value = false
}
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.dashboard-header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left h1 {
  font-size: 20px;
  color: #303133;
  font-weight: 600;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #606266;
  font-size: 14px;
}

.user-info:hover {
  color: #409EFF;
}

.dashboard-main {
  padding: 20px;
}

.stats-cards {
  margin-bottom: 20px;
}

.stats-card .stats-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stats-icon {
  flex-shrink: 0;
}

.stats-number {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
}

.stats-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.actions-section {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.file-formats-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #f4f4f5;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
  margin-top: 8px;
}

.contracts-list {
  min-height: 200px;
}

.contract-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.contract-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.contract-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.contract-icon {
  color: #409EFF;
}

.contract-actions {
  opacity: 0;
  transition: opacity 0.3s;
}

.contract-card:hover .contract-actions {
  opacity: 1;
}

.contract-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.contract-meta {
  font-size: 12px;
  color: #909399;
  margin: 4px 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.contract-status {
  margin-top: 12px;
  text-align: right;
}
</style>