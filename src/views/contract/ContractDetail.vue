<template>
  <div class="contract-detail-container">
    <!-- 顶部操作栏 -->
    <el-header class="detail-header">
      <div class="header-left">
        <el-button
          :icon="ArrowLeft"
          circle
          @click="$router.back()"
        />
        <h1 v-if="!editingTitle" class="contract-title">
          {{ contractStore.currentContract?.title }}
          <el-button
            :icon="Edit"
            text
            size="small"
            @click="startEditTitle"
          />
        </h1>
        <el-input
          v-else
          ref="titleInputRef"
          v-model="editTitle"
          class="title-input"
          @blur="saveTitle"
          @keyup.enter="saveTitle"
          @keyup.escape="cancelEdit"
        />
      </div>
      <div class="header-right">
        <el-button
          :icon="Download"
          @click="downloadContract"
        >
          下载原文件
        </el-button>
      </div>
    </el-header>

    <!-- 主要内容区 -->
    <el-main class="detail-main">
      <div v-loading="contractStore.loading" class="detail-content">
        <!-- 分析状态 -->
        <div v-if="analysisStatus !== 'completed'" class="analysis-status">
          <el-card>
            <div class="status-content">
              <el-icon size="48" class="status-icon">
                <Loading v-if="analysisStatus === 'processing'" />
                <Warning v-else />
              </el-icon>
              <div class="status-info">
                <h3 v-if="analysisStatus === 'processing'">
                  AI 正在分析合同...
                </h3>
                <h3 v-else>分析失败</h3>
                <p>{{ analysisStatus === 'processing' ? '请稍候，这可能需要几分钟时间' : currentAnalysis?.error_message || '分析过程中出现错误' }}</p>
                <el-button
                  v-if="analysisStatus === 'failed'"
                  type="primary"
                  @click="retryAnalysis"
                  :loading="contractStore.analyzing"
                >
                  重新分析
                </el-button>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 分析结果 -->
        <div v-else class="analysis-results">
          <el-row :gutter="20">
            <!-- 左侧：合同文本 -->
            <el-col :span="12">
              <el-card class="text-card">
                <template #header>
                  <div class="card-header">
                    <span>合同文本</span>
                    <el-button
                      :icon="Download"
                      size="small"
                      @click="downloadText"
                    >
                      下载文本
                    </el-button>
                  </div>
                </template>
                <div class="contract-text">
                  {{ contractStore.currentContract?.extracted_text || '文本提取中...' }}
                </div>
              </el-card>
            </el-col>

            <!-- 右侧：分析结果 -->
            <el-col :span="12">
              <!-- 关键信息 -->
              <el-card class="analysis-card">
                <template #header>
                  <div class="card-header">
                    <el-icon><Key /></el-icon>
                    <span>关键信息</span>
                  </div>
                </template>
                <div class="key-terms">
                  <el-descriptions :column="1" border>
                    <el-descriptions-item
                      v-for="term in currentAnalysis?.key_terms"
                      :key="term.term"
                      :label="term.term"
                    >
                      <div class="term-value">
                        {{ term.value }}
                        <el-button
                          :icon="CopyDocument"
                          text
                          size="small"
                          @click="copyToClipboard(term.value)"
                        />
                      </div>
                    </el-descriptions-item>
                  </el-descriptions>
                </div>
              </el-card>

              <!-- 风险提示 -->
              <el-card class="analysis-card">
                <template #header>
                  <div class="card-header">
                    <el-icon color="#F56C6C"><Warning /></el-icon>
                    <span>风险提示</span>
                  </div>
                </template>
                <div class="risk-points">
                  <div
                    v-for="(risk, index) in currentAnalysis?.risk_points"
                    :key="index"
                    class="risk-item"
                    :class="risk.level"
                  >
                    <div class="risk-header">
                      <el-icon>
                        <WarningFilled v-if="risk.level === 'high'" />
                        <Warning v-else />
                      </el-icon>
                      <span class="risk-type">{{ risk.risk }}</span>
                      <el-tag
                        :type="risk.level === 'high' ? 'danger' : 'warning'"
                        size="small"
                      >
                        {{ risk.level === 'high' ? '高风险' : '中风险' }}
                      </el-tag>
                    </div>
                    <p class="risk-description">{{ risk.description }}</p>
                  </div>
                </div>
              </el-card>

              <!-- 关键日期 -->
              <el-card class="analysis-card">
                <template #header>
                  <div class="card-header">
                    <el-icon><Calendar /></el-icon>
                    <span>关键日期</span>
                  </div>
                </template>
                <div class="key-dates">
                  <div
                    v-for="date in currentAnalysis?.key_dates"
                    :key="date.date_type"
                    class="date-item"
                  >
                    <div class="date-info">
                      <span class="date-type">{{ date.date_type }}</span>
                      <span class="date-value">{{ formatDate(date.date_value) }}</span>
                      <span
                        v-if="isOverdue(date.date_value)"
                        class="date-status overdue"
                      >
                        已过期
                      </span>
                    </div>
                    <el-button
                      :icon="Calendar"
                      size="small"
                      @click="exportCalendar([date])"
                    >
                      添加到日历
                    </el-button>
                  </div>
                  <div class="calendar-actions">
                    <el-button
                      type="primary"
                      :icon="Calendar"
                      @click="exportAllDates"
                    >
                      导出所有日期到日历
                    </el-button>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  Edit,
  Download,
  Loading,
  Warning,
  Key,
  CopyDocument,
  WarningFilled,
  Calendar
} from '@element-plus/icons-vue'
import { useContractStore } from '@/stores/contract'
import { useCopy } from '@/composables/useCopy'
import { formatDate, isOverdue } from '@/utils/date'
import { downloadFile, createDownloadLink } from '@/utils/file'
import { exportToCalendar, generateCalendarFilename } from '@/utils/calendar'

const route = useRoute()
const contractStore = useContractStore()
const { copyToClipboard } = useCopy()

const titleInputRef = ref()
const editingTitle = ref(false)
const editTitle = ref('')

// 计算属性
const currentAnalysis = computed(() => contractStore.currentAnalysis)
const analysisStatus = computed(() => currentAnalysis.value?.status || 'pending')

// 页面初始化
onMounted(async () => {
  const contractId = route.params.id
  if (!contractId) {
    console.error('合同ID未找到')
    return
  }
  await contractStore.getContract(contractId)
})

// 开始编辑标题
const startEditTitle = () => {
  editTitle.value = contractStore.currentContract?.title || ''
  editingTitle.value = true
  nextTick(() => {
    titleInputRef.value?.focus()
  })
}

// 保存标题
const saveTitle = async () => {
  if (!editTitle.value.trim()) {
    editTitle.value = contractStore.currentContract?.title || ''
    editingTitle.value = false
    return
  }

  try {
    const contractId = contractStore.currentContract?.id
    if (contractId) {
      await contractStore.updateContract(contractId, {
        title: editTitle.value.trim()
      })
      ElMessage.success('标题更新成功')
    }
  } catch (error) {
    ElMessage.error('标题更新失败')
  } finally {
    editingTitle.value = false
  }
}

// 取消编辑
const cancelEdit = () => {
  editTitle.value = contractStore.currentContract?.title || ''
  editingTitle.value = false
}

// 下载合同文件
const downloadContract = async () => {
  const contract = contractStore.currentContract
  if (!contract) return

  try {
    await downloadFile(contract.file_url, contract.file_name)
  } catch (error) {
    ElMessage.error('下载失败')
  }
}

// 下载文本
const downloadText = () => {
  const text = contractStore.currentContract?.extracted_text
  const title = contractStore.currentContract?.title || '合同文本'
  
  if (text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    createDownloadLink(blob, `${title}.txt`)
  }
}

// 重新分析
const retryAnalysis = async () => {
  const contractId = contractStore.currentContract?.id
  if (contractId) {
    try {
      await contractStore.retryAnalysis(contractId)
    } catch (error) {
      ElMessage.error('重新分析失败')
    }
  }
}

// 导出到日历
const exportCalendar = async (dates) => {
  const contract = contractStore.currentContract
  if (!contract) return

  try {
    const blob = await exportCalendar(contract.title, dates, contract.id)
    const filename = generateCalendarFilename(contract.title)
    createDownloadLink(blob, filename)
    ElMessage.success('日历文件已生成')
  } catch (error) {
    ElMessage.error('日历导出失败')
  }
}

// 导出所有日期
const exportAllDates = () => {
  const dates = currentAnalysis.value?.key_dates || []
  if (dates.length === 0) {
    ElMessage.warning('暂无关键日期')
    return
  }
  exportCalendar(dates)
}
</script>

<style scoped>
.contract-detail-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.detail-header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.contract-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-input {
  width: 300px;
}

.detail-main {
  padding: 20px;
}

.detail-content {
  min-height: 600px;
}

.analysis-status {
  margin-bottom: 20px;
}

.status-content {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 40px 0;
  text-align: center;
}

.status-icon {
  color: #409EFF;
  animation: rotate 2s linear infinite;
}

.status-icon.warning {
  color: #F56C6C;
  animation: none;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.status-info h3 {
  font-size: 18px;
  color: #303133;
  margin: 0 0 8px 0;
}

.status-info p {
  color: #606266;
  margin: 0 0 16px 0;
}

.analysis-results .analysis-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.contract-text {
  max-height: 600px;
  overflow-y: auto;
  line-height: 1.6;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 16px;
  background-color: #fafafa;
  border-radius: 4px;
}

.term-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.risk-item {
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  border: 1px solid #e4e7ed;
}

.risk-item.high {
  background-color: #fef0f0;
  border-color: #fbc4c4;
}

.risk-item.medium {
  background-color: #fdf6ec;
  border-color: #f5dab1;
}

.risk-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.risk-type {
  font-weight: 600;
  color: #303133;
  flex: 1;
}

.risk-description {
  margin: 0;
  color: #606266;
  line-height: 1.5;
}

.date-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 12px;
}

.date-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-type {
  font-weight: 600;
  color: #303133;
}

.date-value {
  color: #409EFF;
  font-weight: 500;
}

.date-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.date-status.overdue {
  background-color: #fef0f0;
  color: #f56c6c;
}

.calendar-actions {
  margin-top: 16px;
  text-align: center;
}
</style>