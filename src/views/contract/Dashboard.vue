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
            <el-card 
              class="stats-card"
              :class="{ 'active-filter': currentFilter === 'all' }"
              @click="handleFilterClick('all')"
            >
              <div class="stats-content">
                <div class="stats-icon">
                  <el-icon size="32" color="#409EFF"><Document /></el-icon>
                </div>
                <div class="stats-info">
                  <div class="stats-number">{{ contractStore.contractsCount }}</div>
                  <div class="stats-label">合同总数</div>
                </div>
                <div class="stats-indicator" v-if="currentFilter === 'all'">
                  <el-icon><Check /></el-icon>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card 
              class="stats-card"
              :class="{ 'active-filter': currentFilter === 'completed' }"
              @click="handleFilterClick('completed')"
            >
              <div class="stats-content">
                <div class="stats-icon">
                  <el-icon size="32" color="#67C23A"><Check /></el-icon>
                </div>
                <div class="stats-info">
                  <div class="stats-number">{{ completedAnalysisCount }}</div>
                  <div class="stats-label">已分析合同</div>
                </div>
                <div class="stats-indicator" v-if="currentFilter === 'completed'">
                  <el-icon><Check /></el-icon>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card 
              class="stats-card"
              :class="{ 'active-filter': currentFilter === 'processing' }"
              @click="handleFilterClick('processing')"
            >
              <div class="stats-content">
                <div class="stats-icon">
                  <el-icon size="32" color="#E6A23C"><Loading /></el-icon>
                </div>
                <div class="stats-info">
                  <div class="stats-number">{{ processingAnalysisCount }}</div>
                  <div class="stats-label">分析中</div>
                </div>
                <div class="stats-indicator" v-if="currentFilter === 'processing'">
                  <el-icon><Check /></el-icon>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card 
              class="stats-card"
              :class="{ 'active-filter': currentFilter === 'risk' }"
              @click="handleFilterClick('risk')"
            >
              <div class="stats-content">
                <div class="stats-icon">
                  <el-icon size="32" color="#F56C6C"><WarningFilled /></el-icon>
                </div>
                <div class="stats-info">
                  <div class="stats-number">{{ riskContractsCount }}</div>
                  <div class="stats-label">风险合同</div>
                </div>
                <div class="stats-indicator" v-if="currentFilter === 'risk'">
                  <el-icon><Check /></el-icon>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 筛选状态提示 -->
      <div v-if="currentFilter !== 'all'" class="filter-status">
        <el-alert
          :title="`当前筛选：${getFilterLabel(currentFilter)} (${filteredContracts.length} 个合同)`"
          type="info"
          :closable="true"
          @close="clearFilter"
          show-icon
        >
          <template #default>
            <el-button
              type="text"
              size="small"
              @click="clearFilter"
            >
              清除筛选
            </el-button>
          </template>
        </el-alert>
      </div>

      <!-- 操作区域 -->
      <div class="actions-section">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>合同管理</span>
              <div class="header-buttons">
                <el-button
                  type="success"
                  :icon="Document"
                  @click="$router.push('/templates')"
                >
                  模板库
                </el-button>
                <el-button
                  type="primary"
                  :icon="Upload"
                  @click="showUploadDialog = true"
                >
                  上传合同
                </el-button>
              </div>
            </div>
            
            <!-- 筛选排序控件 -->
            <div class="filter-controls">
              <div class="filter-row">
                <!-- 状态筛选 -->
                <div class="filter-item">
                  <el-select
                    v-model="statusFilter"
                    placeholder="分析状态"
                    clearable
                    @change="handleFilterChange"
                    style="width: 140px"
                  >
                    <el-option label="全部状态" value="" />
                    <el-option label="未分析" value="pending" />
                    <el-option label="分析中" value="processing" />
                    <el-option label="已分析" value="completed" />
                    <el-option label="分析失败" value="failed" />
                  </el-select>
                </div>

                <!-- 风险级别筛选 -->
                <div class="filter-item">
                  <el-select
                    v-model="riskFilter"
                    placeholder="风险级别"
                    clearable
                    @change="handleFilterChange"
                    style="width: 140px"
                  >
                    <el-option label="全部风险" value="" />
                    <el-option label="高风险" value="high" />
                    <el-option label="中风险" value="medium" />
                    <el-option label="低风险" value="low" />
                    <el-option label="无风险" value="none" />
                  </el-select>
                </div>

                <!-- 时间范围筛选 -->
                <div class="filter-item">
                  <el-date-picker
                    v-model="dateRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    @change="handleFilterChange"
                    style="width: 220px"
                  />
                </div>

                <!-- 排序选项 -->
                <div class="filter-item">
                  <el-select
                    v-model="sortBy"
                    placeholder="排序方式"
                    @change="handleFilterChange"
                    style="width: 140px"
                  >
                    <el-option label="上传时间" value="uploaded_at" />
                    <el-option label="合同标题" value="title" />
                    <el-option label="文件大小" value="file_size" />
                    <el-option label="分析完成时间" value="analyzed_at" />
                  </el-select>
                </div>

                <!-- 排序方向 -->
                <div class="filter-item">
                  <el-button-group>
                    <el-button
                      :type="sortOrder === 'desc' ? 'primary' : 'default'"
                      :icon="SortDown"
                      @click="sortOrder = 'desc'; handleFilterChange()"
                    >
                      降序
                    </el-button>
                    <el-button
                      :type="sortOrder === 'asc' ? 'primary' : 'default'"
                      :icon="SortUp"
                      @click="sortOrder = 'asc'; handleFilterChange()"
                    >
                      升序
                    </el-button>
                  </el-button-group>
                </div>

                <!-- 搜索框 -->
                <div class="filter-item search-box">
                  <el-input
                    v-model="searchKeyword"
                    placeholder="搜索合同标题或文件名"
                    :prefix-icon="Search"
                    clearable
                    @input="handleSearch"
                    style="width: 240px"
                  />
                </div>

                <!-- 清除筛选 -->
                <div class="filter-item">
                  <el-button
                    @click="clearAllFilters"
                    :icon="Refresh"
                  >
                    重置
                  </el-button>
                </div>
              </div>
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
            
            <el-empty
              v-else-if="filteredContracts.length === 0 && !contractStore.loading"
              description="没有符合筛选条件的合同"
            >
              <el-button @click="clearAllFilters" :icon="Refresh">
                清除筛选条件
              </el-button>
            </el-empty>

            <el-row v-else :gutter="20">
              <el-col
                v-for="contract in filteredContracts.filter(c => c && c.id)"
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
  Folder,
  Search,
  Refresh,
  SortDown,
  SortUp
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
const currentFilter = ref('all') // 当前筛选状态：'all', 'completed', 'processing', 'risk'

// 筛选排序状态
const statusFilter = ref('')
const riskFilter = ref('')
const dateRange = ref([])
const sortBy = ref('uploaded_at')
const sortOrder = ref('desc')
const searchKeyword = ref('')

// 计算属性
const completedAnalysisCount = computed(() => {
  return contractStore.contracts.filter(contract => 
    getAnalysisStatus(contract.id) === 'completed'
  ).length
})

const processingAnalysisCount = computed(() => {
  return contractStore.contracts.filter(contract => 
    getAnalysisStatus(contract.id) === 'processing'
  ).length
})

const riskContractsCount = computed(() => {
  return contractStore.contracts.filter(contract => {
    const analysis = contractStore.getContractAnalysis?.(contract.id)
    return analysis?.risk_points?.some(risk => risk.level === 'high') || false
  }).length
})

// 根据筛选条件过滤合同列表
const filteredContracts = computed(() => {
  let contracts = [...contractStore.contracts]
  
  // 首先应用统计卡片筛选
  switch (currentFilter.value) {
    case 'completed':
      contracts = contracts.filter(contract => 
        getAnalysisStatus(contract.id) === 'completed'
      )
      break
    case 'processing':
      contracts = contracts.filter(contract => 
        getAnalysisStatus(contract.id) === 'processing'
      )
      break
    case 'risk':
      contracts = contracts.filter(contract => {
        const analysis = contractStore.getContractAnalysis?.(contract.id)
        return analysis?.risk_points?.some(risk => risk.level === 'high') || false
      })
      break
  }
  
  // 然后应用详细筛选
  // 状态筛选
  if (statusFilter.value) {
    contracts = contracts.filter(contract => 
      getAnalysisStatus(contract.id) === statusFilter.value
    )
  }
  
  // 风险级别筛选
  if (riskFilter.value) {
    contracts = contracts.filter(contract => {
      if (riskFilter.value === 'none') {
        const analysis = contractStore.getContractAnalysis?.(contract.id)
        return !analysis?.risk_points || analysis.risk_points.length === 0
      }
      const analysis = contractStore.getContractAnalysis?.(contract.id)
      return analysis?.risk_points?.some(risk => risk.level === riskFilter.value) || false
    })
  }
  
  // 日期范围筛选
  if (dateRange.value && dateRange.value.length === 2) {
    const [startDate, endDate] = dateRange.value
    contracts = contracts.filter(contract => {
      const uploadDate = new Date(contract.uploaded_at).toISOString().split('T')[0]
      return uploadDate >= startDate && uploadDate <= endDate
    })
  }
  
  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    contracts = contracts.filter(contract => 
      contract.title.toLowerCase().includes(keyword) ||
      contract.file_name.toLowerCase().includes(keyword)
    )
  }
  
  // 排序
  contracts.sort((a, b) => {
    let aValue, bValue
    
    switch (sortBy.value) {
      case 'title':
        aValue = a.title.toLowerCase()
        bValue = b.title.toLowerCase()
        return sortOrder.value === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      case 'file_size':
        aValue = a.file_size || 0
        bValue = b.file_size || 0
        return sortOrder.value === 'asc' ? aValue - bValue : bValue - aValue
      case 'analyzed_at':
        aValue = a.analyzed_at ? new Date(a.analyzed_at).getTime() : 0
        bValue = b.analyzed_at ? new Date(b.analyzed_at).getTime() : 0
        return sortOrder.value === 'asc' ? aValue - bValue : bValue - aValue
      case 'uploaded_at':
      default:
        aValue = new Date(a.uploaded_at).getTime()
        bValue = new Date(b.uploaded_at).getTime()
        return sortOrder.value === 'asc' ? aValue - bValue : bValue - aValue
    }
  })
  
  return contracts
})

// 获取分析状态
const getAnalysisStatus = (contractId) => {
  // 这里需要根据实际的分析结果判断状态
  // 临时返回'completed'，实际需要API查询
  return 'completed'
}

// 页面初始化
onMounted(async () => {
  try {
    await contractStore.fetchContracts()
  } catch (error) {
    console.error('加载合同列表失败:', error)
    // 如果是认证错误，由路由守卫处理重定向
    if (error.response?.status === 401) {
      console.log('认证失败，将由路由守卫处理重定向')
    } else {
      ElMessage.error('加载合同列表失败，请稍后重试')
    }
  }
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

// 处理统计卡片点击筛选
const handleFilterClick = (filterType) => {
  currentFilter.value = filterType
  ElMessage.info(`已切换到：${getFilterLabel(filterType)}`)
}

// 获取筛选标签
const getFilterLabel = (filterType) => {
  const labels = {
    'all': '全部合同',
    'completed': '已分析合同',
    'processing': '分析中合同',
    'risk': '风险合同'
  }
  return labels[filterType] || '全部合同'
}

// 清除筛选
const clearFilter = () => {
  currentFilter.value = 'all'
  ElMessage.info('已清除筛选条件')
}

// 处理筛选变化
const handleFilterChange = () => {
  // 筛选变化时，过滤结果会通过 computed 自动更新
  console.log('筛选条件已更新')
}

// 处理搜索（防抖）
let searchTimer = null
const handleSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    handleFilterChange()
  }, 300)
}

// 清除所有筛选
const clearAllFilters = () => {
  currentFilter.value = 'all'
  statusFilter.value = ''
  riskFilter.value = ''
  dateRange.value = []
  sortBy.value = 'uploaded_at'
  sortOrder.value = 'desc'
  searchKeyword.value = ''
  ElMessage.success('已重置所有筛选条件')
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

.stats-card {
  border-radius: 8px;
  transition: all 0.3s;
  cursor: pointer;
  border: 2px solid transparent;
}

.stats-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.stats-card.active-filter {
  border-color: #409EFF;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  box-shadow: 0 4px 20px rgba(64, 158, 255, 0.15);
}

.stats-card .stats-content {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
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

.stats-indicator {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  color: #409EFF;
  font-size: 16px;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-50%) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) scale(1);
  }
}

.filter-status {
  margin-bottom: 16px;
}

.filter-status :deep(.el-alert) {
  border-radius: 8px;
}

.filter-status :deep(.el-alert__content) {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filter-controls {
  background: #fafafa;
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.filter-item {
  display: flex;
  align-items: center;
}

.search-box :deep(.el-input__wrapper) {
  border-radius: 20px;
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 6px;
}

:deep(.el-date-editor .el-input__wrapper) {
  border-radius: 6px;
}

:deep(.el-button-group .el-button) {
  border-radius: 0;
}

:deep(.el-button-group .el-button:first-child) {
  border-top-left-radius: 6px;
  border-bottom-left-radius: 6px;
}

:deep(.el-button-group .el-button:last-child) {
  border-top-right-radius: 6px;
  border-bottom-right-radius: 6px;
}

@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-item {
    width: 100%;
  }
  
  .filter-item :deep(.el-select),
  .filter-item :deep(.el-date-picker),
  .filter-item :deep(.el-input) {
    width: 100% !important;
  }
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

.header-buttons {
  display: flex;
  gap: 10px;
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