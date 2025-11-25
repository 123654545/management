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
                <WarningFilled v-else />
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
          <el-row :gutter="24">
            <!-- 左侧：合同文本 -->
            <el-col :span="16">
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
            <el-col :span="8">
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
                    <el-icon color="#F56C6C"><WarningFilled /></el-icon>
                    <span>风险提示</span>
                    <el-badge 
                      :value="currentAnalysis?.risk_points?.length || 0" 
                      type="danger"
                      class="risk-count-badge"
                    />
                  </div>
                </template>
                
                <!-- 风险统计概览 -->
                <div class="risk-overview">
                  <el-row :gutter="12">
                    <el-col :span="8">
                      <div class="risk-stat high">
                        <div class="stat-number">{{ getHighRiskCount() }}</div>
                        <div class="stat-label">高风险</div>
                      </div>
                    </el-col>
                    <el-col :span="8">
                      <div class="risk-stat medium">
                        <div class="stat-number">{{ getMediumRiskCount() }}</div>
                        <div class="stat-label">中风险</div>
                      </div>
                    </el-col>
                    <el-col :span="8">
                      <div class="risk-stat total">
                        <div class="stat-number">{{ getTotalRiskCount() }}</div>
                        <div class="stat-label">总计</div>
                      </div>
                    </el-col>
                  </el-row>
                </div>

                <!-- 风险详情列表 -->
                <div class="risk-points">
                  <div
                    v-for="(risk, index) in currentAnalysis?.risk_points"
                    :key="index"
                    class="risk-item"
                    :class="risk.level"
                  >
                    <div class="risk-header">
                      <div class="risk-title">
                        <el-icon size="16">
                          <WarningFilled v-if="risk.level === 'high'" />
                          <WarningFilled v-else />
                        </el-icon>
                        <span class="risk-type">{{ risk.risk }}</span>
                      </div>
                      <div class="risk-meta">
                        <el-tag
                          :type="risk.level === 'high' ? 'danger' : 'warning'"
                          size="small"
                        >
                          {{ risk.level === 'high' ? '高风险' : '中风险' }}
                        </el-tag>
                        <el-tooltip
                          v-if="risk.confidence"
                          content="置信度"
                          placement="top"
                        >
                          <span class="confidence-score">
                            {{ Math.round(risk.confidence * 100) }}%
                          </span>
                        </el-tooltip>
                      </div>
                    </div>
                    
                    <!-- 风险描述 -->
                    <div class="risk-content">
                      <p class="risk-description">{{ risk.description }}</p>
                      
                      <!-- 相关条款 -->
                      <div v-if="risk.related_clause" class="risk-clause">
                        <el-text size="small" type="info">
                          <el-icon><Document /></el-icon>
                          相关条款：{{ risk.related_clause }}
                        </el-text>
                      </div>
                      
                      <!-- 建议措施 -->
                      <div v-if="risk.suggestion" class="risk-suggestion">
                        <div class="suggestion-header">
                          <el-icon size="14"><InfoFilled /></el-icon>
                          <el-text size="small" type="primary">建议措施</el-text>
                        </div>
                        <p class="suggestion-text">{{ risk.suggestion }}</p>
                      </div>
                      
                      <!-- 法律依据 -->
                      <div v-if="risk.legal_basis" class="risk-legal">
                        <div class="legal-header">
                          <el-icon size="14"><Document /></el-icon>
                          <el-text size="small" type="info">法律依据</el-text>
                        </div>
                        <p class="legal-text">{{ risk.legal_basis }}</p>
                      </div>
                      
                      <!-- 影响程度 -->
                      <div v-if="risk.impact_level" class="risk-impact">
                        <div class="impact-header">
                          <el-icon size="14"><Warning /></el-icon>
                          <el-text size="small">影响程度</el-text>
                        </div>
                        <el-rate 
                          :model-value="getImpactLevel(risk.impact_level)"
                          disabled
                          show-text
                          :texts="['轻微', '一般', '严重', '非常严重']"
                          class="impact-rate"
                        />
                      </div>
                    </div>
                    
                    <!-- 操作按钮 -->
                    <div class="risk-actions">
                      <el-button 
                        size="small" 
                        text
                        :icon="CopyDocument"
                        @click="copyRiskDetails(risk)"
                      >
                        复制详情
                      </el-button>
                      <el-button 
                        size="small" 
                        text
                        :icon="View"
                        @click="showRiskDetail(risk)"
                      >
                        查看详情
                      </el-button>
                      <el-button 
                        size="small" 
                        text
                        type="danger"
                        :icon="WarningFilled"
                        @click="reportRisk(risk)"
                      >
                        标记重要
                      </el-button>
                    </div>
                  </div>
                </div>
                
                <!-- 风险分析总结 -->
                <div v-if="currentAnalysis?.risk_points?.length > 0" class="risk-summary">
                  <el-collapse>
                    <el-collapse-item title="风险分析总结" name="summary">
                      <div class="summary-content">
                        <el-descriptions :column="2" size="small" border>
                          <el-descriptions-item label="主要风险类型">
                            {{ getMainRiskTypes().join('、') || '暂无' }}
                          </el-descriptions-item>
                          <el-descriptions-item label="平均置信度">
                            {{ getAverageConfidence() }}%
                          </el-descriptions-item>
                          <el-descriptions-item label="紧急处理项">
                            {{ getUrgentRisks() }}项需要立即关注
                          </el-descriptions-item>
                          <el-descriptions-item label="风险评级">
                            <el-tag 
                              :type="getOverallRiskLevel().type" 
                              size="small"
                            >
                              {{ getOverallRiskLevel().text }}
                            </el-tag>
                          </el-descriptions-item>
                        </el-descriptions>
                      </div>
                    </el-collapse-item>
                  </el-collapse>
                </div>
              </el-card>

              <!-- 关键日期 -->
              <el-card class="analysis-card">
                <template #header>
                  <div class="card-header">
                    <el-icon><Calendar /></el-icon>
                    <span>关键日期</span>
                    <div class="date-header-actions">
                      <el-badge 
                        :value="getUpcomingDatesCount()" 
                        type="warning"
                        :hidden="getUpcomingDatesCount() === 0"
                      >
                        <el-button
                          size="small"
                          text
                          :icon="Plus"
                          @click="showAddDateDialog"
                        >
                          添加日期
                        </el-button>
                      </el-badge>
                      <el-dropdown @command="handleDateCommand">
                        <el-button size="small" text>
                          更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                        </el-button>
                        <template #dropdown>
                          <el-dropdown-menu>
                            <el-dropdown-item command="sort">排序日期</el-dropdown-item>
                            <el-dropdown-item command="timeline">时间轴视图</el-dropdown-item>
                            <el-dropdown-item command="reminders">设置提醒</el-dropdown-item>
                            <el-dropdown-item command="export">批量导出</el-dropdown-item>
                          </el-dropdown-menu>
                        </template>
                      </el-dropdown>
                    </div>
                  </div>
                </template>

                <!-- 日期统计概览 -->
                <div class="date-overview">
                  <el-row :gutter="12">
                    <el-col :span="6">
                      <div class="date-stat overdue">
                        <div class="stat-number">{{ getOverdueDatesCount() }}</div>
                        <div class="stat-label">已过期</div>
                      </div>
                    </el-col>
                    <el-col :span="6">
                      <div class="date-stat urgent">
                        <div class="stat-number">{{ getUrgentDatesCount() }}</div>
                        <div class="stat-label">7天内</div>
                      </div>
                    </el-col>
                    <el-col :span="6">
                      <div class="date-stat upcoming">
                        <div class="stat-number">{{ getUpcomingDatesCount() }}</div>
                        <div class="stat-label">即将到期</div>
                      </div>
                    </el-col>
                    <el-col :span="6">
                      <div class="date-stat total">
                        <div class="stat-number">{{ getTotalDatesCount() }}</div>
                        <div class="stat-label">总计</div>
                      </div>
                    </el-col>
                  </el-row>
                </div>

                <!-- 日期列表 -->
                <div class="key-dates">
                  <div v-if="dateViewMode === 'list'" class="date-list">
                    <div
                      v-for="(date, index) in getSortedDates()"
                      :key="index"
                      class="date-item"
                      :class="getDateItemClass(date)"
                    >
                      <div class="date-left">
                        <div class="date-indicator">
                          <el-icon size="16" :color="getIndicatorColor(date)">
                            <Clock v-if="isToday(date.date_value)" />
                            <WarningFilled v-else-if="isOverdue(date.date_value)" />
                            <Calendar v-else />
                          </el-icon>
                        </div>
                        <div class="date-content">
                          <div class="date-header">
                            <span class="date-type">{{ date.date_type }}</span>
                            <el-tag
                              :type="getDateTagType(date)"
                              size="small"
                            >
                              {{ getDateStatusText(date) }}
                            </el-tag>
                          </div>
                          <div class="date-details">
                            <span class="date-value">{{ formatDate(date.date_value) }}</span>
                            <span class="date-remaining">{{ getDaysRemaining(date.date_value) }}</span>
                          </div>
                          <div v-if="date.description" class="date-description">
                            {{ date.description }}
                          </div>
                        </div>
                      </div>
                      <div class="date-actions">
                        <el-dropdown @command="(cmd) => handleDateAction(cmd, date)">
                          <el-button size="small" text>
                            操作<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                          </el-button>
                          <template #dropdown>
                            <el-dropdown-menu>
                              <el-dropdown-item command="edit">
                                <el-icon><Edit /></el-icon>编辑
                              </el-dropdown-item>
                              <el-dropdown-item command="remind">
                                <el-icon><Bell /></el-icon>设置提醒
                              </el-dropdown-item>
                              <el-dropdown-item command="calendar">
                                <el-icon><Calendar /></el-icon>添加到日历
                              </el-dropdown-item>
                              <el-dropdown-item command="copy">
                                <el-icon><CopyDocument /></el-icon>复制信息
                              </el-dropdown-item>
                              <el-dropdown-item command="delete" divided>
                                <el-icon><Delete /></el-icon>删除
                              </el-dropdown-item>
                            </el-dropdown-menu>
                          </template>
                        </el-dropdown>
                      </div>
                    </div>
                  </div>

                  <!-- 时间轴视图 -->
                  <div v-else-if="dateViewMode === 'timeline'" class="date-timeline">
                    <el-timeline>
                      <el-timeline-item
                        v-for="(date, index) in getSortedDates()"
                        :key="index"
                        :timestamp="formatDate(date.date_value)"
                        :type="getTimelineType(date)"
                        :size="isToday(date.date_value) ? 'large' : 'normal'"
                      >
                        <div class="timeline-content">
                          <h4>{{ date.date_type }}</h4>
                          <p v-if="date.description">{{ date.description }}</p>
                          <div class="timeline-actions">
                            <el-button size="small" text @click="exportCalendar([date])">
                              添加到日历
                            </el-button>
                            <el-button size="small" text @click="setReminder(date)">
                              设置提醒
                            </el-button>
                          </div>
                        </div>
                      </el-timeline-item>
                    </el-timeline>
                  </div>

                  <!-- 日历视图 -->
                  <div v-else-if="dateViewMode === 'calendar'" class="date-calendar">
                    <el-calendar v-model="calendarDate">
                      <template #dateCell="{ data }">
                        <div class="calendar-cell">
                          <p :class="data.isSelected ? 'is-selected' : ''">
                            {{ data.day.split('-').slice(2).join('-') }}
                          </p>
                          <div v-if="hasDateOnDay(data.day)" class="date-markers">
                            <div
                              v-for="marker in getDatesForDay(data.day)"
                              :key="marker.type"
                              class="date-marker"
                              :class="marker.type"
                            ></div>
                          </div>
                        </div>
                      </template>
                    </el-calendar>
                  </div>
                </div>

                <!-- 快捷操作 -->
                <div class="date-shortcuts">
                  <el-row :gutter="8">
                    <el-col :span="6">
                      <el-button size="small" @click="setViewMode('list')">
                        <el-icon><List /></el-icon>列表
                      </el-button>
                    </el-col>
                    <el-col :span="6">
                      <el-button size="small" @click="setViewMode('timeline')">
                        <el-icon><Timer /></el-icon>时间轴
                      </el-button>
                    </el-col>
                    <el-col :span="6">
                      <el-button size="small" @click="setViewMode('calendar')">
                        <el-icon><Calendar /></el-icon>日历
                      </el-button>
                    </el-col>
                    <el-col :span="6">
                      <el-button size="small" type="primary" @click="exportAllDates">
                        <el-icon><Download /></el-icon>批量导出
                      </el-button>
                    </el-col>
                  </el-row>
                </div>

                <!-- 日期设置对话框 -->
                <el-dialog
                  v-model="dateDialogVisible"
                  :title="isEditingDate ? '编辑日期' : '添加日期'"
                  width="500px"
                >
                  <el-form
                    ref="dateFormRef"
                    :model="dateForm"
                    :rules="dateFormRules"
                    label-width="80px"
                  >
                    <el-form-item label="日期类型" prop="date_type">
                      <el-select v-model="dateForm.date_type" placeholder="选择日期类型">
                        <el-option label="签订日期" value="签订日期" />
                        <el-option label="生效日期" value="生效日期" />
                        <el-option label="到期日期" value="到期日期" />
                        <el-option label="付款日期" value="付款日期" />
                        <el-option label="交付日期" value="交付日期" />
                        <el-option label="验收日期" value="验收日期" />
                        <el-option label="通知日期" value="通知日期" />
                        <el-option label="其他日期" value="其他日期" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="日期" prop="date_value">
                      <el-date-picker
                        v-model="dateForm.date_value"
                        type="date"
                        placeholder="选择日期"
                        style="width: 100%"
                      />
                    </el-form-item>
                    <el-form-item label="描述" prop="description">
                      <el-input
                        v-model="dateForm.description"
                        type="textarea"
                        :rows="3"
                        placeholder="日期描述说明"
                      />
                    </el-form-item>
                    <el-form-item label="重要性">
                      <el-select v-model="dateForm.importance" placeholder="选择重要性">
                        <el-option label="低" value="low" />
                        <el-option label="中" value="medium" />
                        <el-option label="高" value="high" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="提醒设置">
                      <el-checkbox-group v-model="dateForm.reminders">
                        <el-checkbox label="7天前">提前7天</el-checkbox>
                        <el-checkbox label="3天前">提前3天</el-checkbox>
                        <el-checkbox label="1天前">提前1天</el-checkbox>
                        <el-checkbox label="当天">当天</el-checkbox>
                      </el-checkbox-group>
                    </el-form-item>
                  </el-form>
                  <template #footer>
                    <el-button @click="dateDialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="saveDate">确定</el-button>
                  </template>
                </el-dialog>
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
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Edit,
  Download,
  Loading,
  Warning,
  Key,
  CopyDocument,
  WarningFilled,
  Calendar,
  Document,
  InfoFilled,
  View,
  Plus,
  ArrowDown,
  Clock,
  Bell,
  Delete,
  List,
  Timer
} from '@element-plus/icons-vue'
import { useContractStore } from '@/stores/contract'
import { useCopy } from '@/composables/useCopy'
import { formatDate, isOverdue } from '@/utils/date'
import { downloadFile, createDownloadLink } from '@/utils/file'
import { exportToCalendar, generateCalendarFilename } from '@/utils/calendar'

const route = useRoute()
const router = useRouter()
const contractId = computed(() => route.params.id)
const contractStore = useContractStore()
const { copyToClipboard } = useCopy()

const titleInputRef = ref()
const editingTitle = ref(false)
const editTitle = ref('')

// 日期相关响应式数据
const dateViewMode = ref('list') // list, timeline, calendar
const calendarDate = ref(new Date())
const dateDialogVisible = ref(false)
const isEditingDate = ref(false)
const dateFormRef = ref()
const dateForm = ref({
  date_type: '',
  date_value: '',
  description: '',
  importance: 'medium',
  reminders: []
})
const dateFormRules = {
  date_type: [{ required: true, message: '请选择日期类型', trigger: 'change' }],
  date_value: [{ required: true, message: '请选择日期', trigger: 'change' }]
}

// 计算属性
const currentAnalysis = computed(() => contractStore.currentAnalysis)
const analysisStatus = computed(() => currentAnalysis.value?.analysis_status || 'pending')

// 页面初始化
onMounted(async () => {
  try {
    await contractStore.getContract(contractId.value)
    
    // 如果分析状态为pending，自动触发分析
    if (analysisStatus.value === 'pending') {
      console.log('检测到待分析合同，自动触发分析...')
      try {
        await contractStore.analyzeContract(contractId.value)
      } catch (error) {
        console.error('自动分析失败:', error)
        // 不抛出错误，避免影响页面显示
      }
    }
  } catch (error) {
    ElMessage.error('获取合同详情失败')
  }
})

// 开始编辑标题
const startEditTitle = () => {
  editingTitle.value = true
  editTitle.value = contractStore.currentContract?.title || ''
  nextTick(() => {
    titleInputRef.value?.focus()
  })
  // 已在onMounted中获取合同，不需要重复获取
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
    const blob = await exportToCalendar(contract.title, dates, contract.id)
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

// 风险统计相关方法
const getHighRiskCount = () => {
  return currentAnalysis.value?.risk_points?.filter(risk => risk.level === 'high')?.length || 0
}

const getMediumRiskCount = () => {
  return currentAnalysis.value?.risk_points?.filter(risk => risk.level === 'medium')?.length || 0
}

const getTotalRiskCount = () => {
  return currentAnalysis.value?.risk_points?.length || 0
}

// 获取主要风险类型
const getMainRiskTypes = () => {
  const risks = currentAnalysis.value?.risk_points || []
  const types = risks.map(risk => risk.risk)
  return [...new Set(types)].slice(0, 3) // 去重并只显示前3个
}

// 获取平均置信度
const getAverageConfidence = () => {
  const risks = currentAnalysis.value?.risk_points || []
  if (risks.length === 0) return 0
  
  const totalConfidence = risks.reduce((sum, risk) => {
    return sum + (risk.confidence || 0.5)
  }, 0)
  
  return Math.round((totalConfidence / risks.length) * 100)
}

// 获取需要紧急处理的风险数量
const getUrgentRisks = () => {
  return currentAnalysis.value?.risk_points?.filter(risk => 
    risk.level === 'high' && (risk.confidence || 0) > 0.8
  )?.length || 0
}

// 获取整体风险等级
const getOverallRiskLevel = () => {
  const highRiskCount = getHighRiskCount()
  const mediumRiskCount = getMediumRiskCount()
  const totalCount = getTotalRiskCount()
  
  if (totalCount === 0) return { type: 'info', text: '无风险' }
  if (highRiskCount >= 3) return { type: 'danger', text: '极高风险' }
  if (highRiskCount >= 1) return { type: 'danger', text: '高风险' }
  if (mediumRiskCount >= 3) return { type: 'warning', text: '中高风险' }
  if (mediumRiskCount >= 1) return { type: 'warning', text: '中等风险' }
  return { type: 'success', text: '低风险' }
}

// 获取影响程度对应的评分
const getImpactLevel = (level) => {
  const impactMap = {
    '轻微': 1,
    '一般': 2,
    '严重': 3,
    '非常严重': 4,
    'low': 1,
    'medium': 2,
    'high': 3,
    'critical': 4
  }
  return impactMap[level] || 2
}

// 复制风险详情
const copyRiskDetails = (risk) => {
  const details = `风险类型：${risk.risk}
风险等级：${risk.level === 'high' ? '高风险' : '中风险'}
风险描述：${risk.description}
${risk.suggestion ? `建议措施：${risk.suggestion}` : ''}
${risk.related_clause ? `相关条款：${risk.related_clause}` : ''}
${risk.confidence ? `置信度：${Math.round(risk.confidence * 100)}%` : ''}`
  
  copyToClipboard(details)
  ElMessage.success('风险详情已复制到剪贴板')
}

// 显示风险详情对话框
const showRiskDetail = (risk) => {
  ElMessageBox.alert(
    `
    <div style="text-align: left;">
      <h3>${risk.risk}</h3>
      <p><strong>风险等级：</strong>${risk.level === 'high' ? '高风险' : '中风险'}</p>
      <p><strong>风险描述：</strong>${risk.description}</p>
      ${risk.suggestion ? `<p><strong>建议措施：</strong>${risk.suggestion}</p>` : ''}
      ${risk.related_clause ? `<p><strong>相关条款：</strong>${risk.related_clause}</p>` : ''}
      ${risk.legal_basis ? `<p><strong>法律依据：</strong>${risk.legal_basis}</p>` : ''}
      ${risk.confidence ? `<p><strong>置信度：</strong>${Math.round(risk.confidence * 100)}%</p>` : ''}
      ${risk.impact_level ? `<p><strong>影响程度：</strong>${risk.impact_level}</p>` : ''}
    </div>
    `,
    '风险详情',
    {
      dangerouslyUseHTMLString: true,
      type: risk.level === 'high' ? 'error' : 'warning'
    }
  )
}

// 标记重要风险
const reportRisk = (risk) => {
  ElMessageBox.confirm(
    `确定要将"${risk.risk}"标记为重要风险项吗？这将优先处理此项风险。`,
    '标记重要风险',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 这里可以调用API将风险标记为重要
    ElMessage.success('已标记为重要风险项')
  }).catch(() => {
    // 用户取消
  })
}

// 日期统计方法
const getOverdueDatesCount = () => {
  const dates = currentAnalysis.value?.key_dates || []
  return dates.filter(date => isOverdue(date.date_value)).length
}

const getUrgentDatesCount = () => {
  const dates = currentAnalysis.value?.key_dates || []
  const now = new Date()
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  return dates.filter(date => {
    const dateValue = new Date(date.date_value)
    return dateValue >= now && dateValue <= sevenDaysLater
  }).length
}

const getUpcomingDatesCount = () => {
  const dates = currentAnalysis.value?.key_dates || []
  const now = new Date()
  return dates.filter(date => {
    const dateValue = new Date(date.date_value)
    return dateValue > now
  }).length
}

const getTotalDatesCount = () => {
  return currentAnalysis.value?.key_dates?.length || 0
}

// 日期工具方法
const isToday = (dateValue) => {
  const today = new Date()
  const date = new Date(dateValue)
  return today.toDateString() === date.toDateString()
}

const getDaysRemaining = (dateValue) => {
  const now = new Date()
  const date = new Date(dateValue)
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return `已过期 ${Math.abs(diffDays)} 天`
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '明天'
  if (diffDays <= 7) return `${diffDays} 天后`
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} 周后`
  return `${Math.ceil(diffDays / 30)} 个月后`
}

const getDateItemClass = (date) => {
  const classes = []
  if (isOverdue(date.date_value)) classes.push('overdue')
  if (isToday(date.date_value)) classes.push('today')
  if (date.importance === 'high') classes.push('important')
  return classes.join(' ')
}

const getIndicatorColor = (date) => {
  if (isToday(date.date_value)) return '#409EFF'
  if (isOverdue(date.date_value)) return '#F56C6C'
  return '#67C23A'
}

const getDateTagType = (date) => {
  if (isOverdue(date.date_value)) return 'danger'
  if (isToday(date.date_value)) return 'primary'
  const daysRemaining = Math.ceil((new Date(date.date_value).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  if (daysRemaining <= 7) return 'warning'
  return 'info'
}

const getDateStatusText = (date) => {
  if (isOverdue(date.date_value)) return '已过期'
  if (isToday(date.date_value)) return '今天'
  const daysRemaining = Math.ceil((new Date(date.date_value).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  if (daysRemaining <= 7) return '即将到期'
  if (daysRemaining <= 30) return '临近'
  return '远期'
}

const getSortedDates = () => {
  const dates = [...(currentAnalysis.value?.key_dates || [])]
  return dates.sort((a, b) => new Date(a.date_value).getTime() - new Date(b.date_value).getTime())
}

const getTimelineType = (date) => {
  if (isOverdue(date.date_value)) return 'danger'
  if (isToday(date.date_value)) return 'primary'
  if (date.importance === 'high') return 'warning'
  return 'success'
}

// 视图模式切换
const setViewMode = (mode) => {
  dateViewMode.value = mode
}

// 日期操作
const showAddDateDialog = () => {
  isEditingDate.value = false
  dateForm.value = {
    date_type: '',
    date_value: '',
    description: '',
    importance: 'medium',
    reminders: []
  }
  dateDialogVisible.value = true
}

const handleDateCommand = (command) => {
  switch (command) {
    case 'sort':
      // 切换排序方式
      ElMessage.info('日期已重新排序')
      break
    case 'timeline':
      dateViewMode.value = 'timeline'
      break
    case 'reminders':
      ElMessage.info('提醒设置功能开发中')
      break
    case 'export':
      exportAllDates()
      break
  }
}

const handleDateAction = (command, date) => {
  switch (command) {
    case 'edit':
      editDate(date)
      break
    case 'remind':
      setReminder(date)
      break
    case 'calendar':
      exportCalendar([date])
      break
    case 'copy':
      copyDateInfo(date)
      break
    case 'delete':
      deleteDate(date)
      break
  }
}

const editDate = (date) => {
  isEditingDate.value = true
  dateForm.value = { ...date }
  dateDialogVisible.value = true
}

const saveDate = () => {
  dateFormRef.value?.validate((valid) => {
    if (valid) {
      // 这里需要调用API保存日期
      ElMessage.success(isEditingDate.value ? '日期已更新' : '日期已添加')
      dateDialogVisible.value = false
    }
  })
}

const setReminder = (date) => {
  ElMessageBox.prompt('请输入提醒时间', '设置提醒', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /^.{1,}$/,
    inputErrorMessage: '提醒时间不能为空'
  }).then(({ value }) => {
    ElMessage.success(`已为"${date.date_type}"设置提醒：${value}`)
  })
}

const copyDateInfo = (date) => {
  const info = `日期类型：${date.date_type}
日期：${formatDate(date.date_value)}
${date.description ? `描述：${date.description}` : ''}
剩余时间：${getDaysRemaining(date.date_value)}`
  copyToClipboard(info)
  ElMessage.success('日期信息已复制')
}

const deleteDate = (date) => {
  ElMessageBox.confirm(
    `确定要删除"${date.date_type}"吗？`,
    '删除日期',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 这里需要调用API删除日期
    ElMessage.success('日期已删除')
  })
}

// 日历视图相关
const hasDateOnDay = (day) => {
  const dates = currentAnalysis.value?.key_dates || []
  return dates.some(date => date.date_value === day)
}

const getDatesForDay = (day) => {
  const dates = currentAnalysis.value?.key_dates || []
  return dates.filter(date => date.date_value === day).map(date => ({
    type: date.importance
  }))
}
</script>

<style scoped>
.contract-detail-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8f0fe 100%);
}

.detail-header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 64px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.contract-title {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-input {
  width: 300px;
}

.detail-main {
  padding: 32px;
}

.detail-content {
  min-height: 600px;
}

.analysis-status {
  margin-bottom: 32px;
}

.status-content {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 48px 0;
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
  border: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.analysis-card :deep(.el-card__body) {
  padding: 18px;
}

/* 右侧分析区域优化 */
.analysis-card :deep(.el-card__header) {
  padding: 14px 18px;
  min-height: 48px;
}

.analysis-card :deep(.el-descriptions__label) {
  font-size: 13px !important;
  font-weight: 600 !important;
}

.analysis-card :deep(.el-descriptions__content) {
  font-size: 13px !important;
}

/* 风险标题优化 */
.risk-type {
  font-size: 14px !important;
  font-weight: 600;
  color: #303133;
  flex: 1;
}

.risk-description {
  font-size: 13px !important;
  margin: 0 0 10px 0;
  color: #606266;
  line-height: 1.4;
}

/* 日期项优化 */
.date-item {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.date-left {
  width: 100%;
  align-items: flex-start;
}

.analysis-card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
  border-bottom: 1px solid #e8f0fe;
}

.contract-text {
  max-height: 600px;
  overflow-y: auto;
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 24px;
  background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
  border-radius: 8px;
  border: 1px solid #e8f0fe;
}

.term-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.risk-item {
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 14px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.risk-item:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.10);
  transform: translateY(-2px);
}

.risk-item.high {
  background: linear-gradient(135deg, #fef0f0 0%, #fde2e2 100%);
  border-left: 4px solid #f56c6c;
}

.risk-item.medium {
  background: linear-gradient(135deg, #fdf6ec 0%, #fce8d2 100%);
  border-left: 4px solid #e6a23c;
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
  margin: 0 0 12px 0;
  color: #606266;
  line-height: 1.5;
}

/* 风险统计概览 */
.risk-overview {
  margin-bottom: 20px;
  padding: 16px;
  background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.risk-stat {
  text-align: center;
  padding: 12px 8px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.risk-stat:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.risk-stat.high {
  background: linear-gradient(135deg, #fef0f0 0%, #fde2e2 100%);
  border-left: 3px solid #f56c6c;
}

.risk-stat.medium {
  background: linear-gradient(135deg, #fdf6ec 0%, #fce8d2 100%);
  border-left: 3px solid #e6a23c;
}

.risk-stat.total {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-left: 3px solid #409eff;
}

.stat-number {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 6px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.risk-stat.high .stat-number {
  color: #f56c6c;
  text-shadow: 0 2px 4px rgba(245, 108, 108, 0.2);
}

.risk-stat.medium .stat-number {
  color: #e6a23c;
  text-shadow: 0 2px 4px rgba(230, 162, 60, 0.2);
}

.risk-stat.total .stat-number {
  color: #409eff;
  text-shadow: 0 2px 4px rgba(64, 158, 255, 0.2);
}

.stat-label {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

/* 风险计数徽章 */
.risk-count-badge {
  margin-left: auto;
}

/* 增强的风险项样式 */
.risk-item {
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

.risk-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.risk-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.risk-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.risk-type {
  font-weight: 600;
  color: #303133;
  font-size: 16px;
}

.risk-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.confidence-score {
  font-size: 12px;
  font-weight: 600;
  color: #409eff;
  background-color: #ecf5ff;
  padding: 2px 6px;
  border-radius: 10px;
}

.risk-content {
  margin-bottom: 16px;
}

.risk-clause {
  margin-bottom: 8px;
  padding: 8px 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #409eff;
}

.risk-suggestion {
  margin-bottom: 8px;
  padding: 12px;
  background-color: #f0f9ff;
  border-radius: 6px;
  border-left: 3px solid #409eff;
}

.suggestion-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.suggestion-text {
  margin: 0;
  color: #1e40af;
  line-height: 1.5;
  font-size: 14px;
}

.risk-legal {
  margin-bottom: 8px;
  padding: 12px;
  background-color: #f9fafb;
  border-radius: 6px;
  border-left: 3px solid #6b7280;
}

.legal-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.legal-text {
  margin: 0;
  color: #4b5563;
  line-height: 1.5;
  font-size: 14px;
}

.risk-impact {
  margin-bottom: 8px;
}

.impact-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.impact-rate {
  margin-top: 4px;
}

.impact-rate :deep(.el-rate__text) {
  font-size: 12px;
  color: #606266;
}

.risk-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.risk-actions .el-button {
  font-size: 12px;
}

/* 风险总结 */
.risk-summary {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #e4e7ed;
}

.summary-content {
  padding: 16px;
  background-color: #fafbfc;
  border-radius: 6px;
}

/* 日期相关样式 */
.date-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* 日期统计概览 */
.date-overview {
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.date-stat {
  text-align: center;
  padding: 12px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.date-stat:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.date-stat.overdue {
  background: linear-gradient(135deg, #fef0f0 0%, #fde2e2 100%);
  border: 1px solid #fbc4c4;
}

.date-stat.overdue .stat-number {
  color: #f56c6c;
}

.date-stat.urgent {
  background: linear-gradient(135deg, #fdf6ec 0%, #fce8d2 100%);
  border: 1px solid #f5dab1;
}

.date-stat.urgent .stat-number {
  color: #e6a23c;
}

.date-stat.upcoming {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
}

.date-stat.upcoming .stat-number {
  color: #409eff;
}

.date-stat.total {
  background: linear-gradient(135deg, #f6ffed 0%, #e7f6d3 100%);
  border: 1px solid #b7eb8f;
}

.date-stat.total .stat-number {
  color: #67c23a;
}

/* 增强的日期项样式 */
.date-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: none;
  border-radius: 12px;
  margin-bottom: 14px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.date-item:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.10);
  transform: translateY(-2px);
}

.date-item.overdue {
  background: linear-gradient(135deg, #fef0f0 0%, #fde2e2 100%);
  border-left: 4px solid #f56c6c;
}

.date-item.today {
  background: linear-gradient(135deg, #ecf5ff 0%, #dbeafe 100%);
  border-left: 4px solid #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.3);
}

.date-item.important {
  border-left: 4px solid #e6a23c;
}

.date-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
}

.date-indicator {
  padding-top: 2px;
}

.date-content {
  flex: 1;
}

.date-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.date-type {
  font-weight: 600;
  color: #303133;
}

.date-details {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.date-value {
  color: #409eff;
  font-weight: 500;
}

.date-remaining {
  font-size: 12px;
  color: #909399;
  background-color: #f0f0f0;
  padding: 2px 6px;
  border-radius: 10px;
}

.date-description {
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
}

.date-actions {
  display: flex;
  align-items: center;
}

/* 时间轴视图样式 */
.date-timeline {
  padding: 16px 0;
}

.timeline-content h4 {
  margin: 0 0 8px 0;
  color: #303133;
}

.timeline-content p {
  margin: 0 0 12px 0;
  color: #606266;
  font-size: 14px;
}

.timeline-actions {
  display: flex;
  gap: 8px;
}

/* 日历视图样式 */
.date-calendar {
  padding: 16px 0;
}

.calendar-cell {
  height: 100%;
  padding: 4px;
  text-align: center;
}

.calendar-cell p {
  margin: 0;
  font-size: 12px;
}

.date-markers {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  justify-content: center;
  margin-top: 2px;
}

.date-marker {
  width: 4px;
  height: 4px;
  border-radius: 50%;
}

.date-marker.high {
  background-color: #f56c6c;
}

.date-marker.medium {
  background-color: #e6a23c;
}

.date-marker.low {
  background-color: #67c23a;
}

/* 快捷操作样式 */
.date-shortcuts {
  margin-top: 32px;
  padding: 24px 20px 20px;
  background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

/* 对话框样式增强 */
.el-dialog__body .el-form-item {
  margin-bottom: 18px;
}

/* 全局阴影优化 */
.analysis-card,
.risk-overview,
.date-overview,
.risk-item,
.date-item,
.risk-stat,
.date-stat,
.date-shortcuts {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 按钮样式优化 */
.el-button {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
  font-weight: 500;
}

.el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.el-button--icon {
  border-radius: 50%;
}

/* 标签样式优化 */
.el-tag {
  border-radius: 12px;
  font-weight: 500;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

/* 输入框样式优化 */
.el-input__wrapper {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.el-input__wrapper:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

/* 描述列表样式优化 */
.el-descriptions {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* 下拉菜单样式优化 */
.el-dropdown-menu {
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: none;
  padding: 8px;
}

/* 时间轴样式优化 */
.el-timeline-item__node {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 响应式优化 */
@media (max-width: 768px) {
  .detail-main {
    padding: 16px;
  }
  
  .analysis-card {
    margin-bottom: 16px;
  }
  
  .risk-overview,
  .date-overview {
    margin-bottom: 16px;
    padding: 16px;
  }
  
  .risk-item,
  .date-item {
    padding: 16px;
    margin-bottom: 12px;
  }
  
  .contract-title {
    font-size: 18px;
  }
  
  .stat-number {
    font-size: 24px;
  }
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