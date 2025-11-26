<template>
  <div class="template-library">
    <div class="page-header">
      <h1>合同模板库</h1>
      <p>选择适合的合同模板，快速创建标准化合同</p>
    </div>

    <!-- 搜索和筛选 -->
    <div class="filter-section">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索模板名称..."
            prefix-icon="Search"
            clearable
            @input="handleSearch"
          />
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="selectedCategory"
            placeholder="选择分类"
            clearable
            @change="handleCategoryChange"
          >
            <el-option
              v-for="category in categories"
              :key="category.value"
              :label="category.label"
              :value="category.value"
            />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="sortBy"
            placeholder="排序方式"
            @change="handleSort"
          >
            <el-option label="最新上传" value="createdAt" />
            <el-option label="使用次数" value="useCount" />
            <el-option label="评分最高" value="rating" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" icon="Plus" @click="showUploadDialog">
            上传模板
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 模板列表 -->
    <div class="template-grid" v-loading="loading">
      <el-row :gutter="20">
        <el-col
          :span="8"
          v-for="template in filteredTemplates"
          :key="template.id"
          class="template-item"
        >
          <el-card class="template-card" shadow="hover">
            <div class="template-preview">
              <el-image
                :src="template.preview || '/default-template.png'"
                fit="cover"
                class="preview-image"
              >
                <template #error>
                  <div class="image-placeholder">
                    <el-icon size="40"><Document /></el-icon>
                  </div>
                </template>
              </el-image>
            </div>
            
            <div class="template-info">
              <h3 class="template-title">{{ template.name }}</h3>
              <p class="template-desc">{{ template.description }}</p>
              
              <div class="template-meta">
                <el-tag size="small">{{ getCategoryName(template.category) }}</el-tag>
                <span class="use-count">
                  <el-icon><View /></el-icon>
                  {{ template.useCount || 0 }}次使用
                </span>
              </div>
              
              <div class="template-rating">
                <el-rate
                  v-model="template.rating"
                  disabled
                  show-score
                  text-color="#ff9900"
                  score-template="{value}"
                />
              </div>
              
              <div class="template-actions">
                <el-button
                  type="primary"
                  size="small"
                  @click="useTemplate(template)"
                >
                  使用模板
                </el-button>
                <el-button
                  size="small"
                  @click="handlePreviewTemplate(template)"
                >
                  预览
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 空状态 -->
      <el-empty
        v-if="filteredTemplates.length === 0 && !loading"
        description="暂无模板数据"
      >
        <el-button type="primary" @click="showUploadDialog">
          上传第一个模板
        </el-button>
      </el-empty>
    </div>

    <!-- 分页 -->
    <div class="pagination-section" v-if="total > 0">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[12, 24, 48]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 上传模板对话框 -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="上传合同模板"
      width="600px"
      @close="resetUploadForm"
    >
      <el-form
        ref="uploadFormRef"
        :model="uploadForm"
        :rules="uploadRules"
        label-width="100px"
      >
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="uploadForm.name" placeholder="请输入模板名称" />
        </el-form-item>
        
        <el-form-item label="模板分类" prop="category">
          <el-select v-model="uploadForm.category" placeholder="选择分类">
            <el-option
              v-for="category in categories"
              :key="category.value"
              :label="category.label"
              :value="category.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="模板描述" prop="description">
          <el-input
            v-model="uploadForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入模板描述"
          />
        </el-form-item>
        
        <el-form-item label="模板文件" prop="file">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            accept=".doc,.docx,.pdf"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">
                支持 .doc, .docx, .pdf 格式，文件大小不超过 10MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="uploadDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitUpload" :loading="uploading">
            上传
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      :title="currentPreviewTemplate?.name"
      width="80%"
      @close="currentPreviewTemplate = null"
    >
      <div class="preview-content" v-loading="previewLoading">
        <div v-html="previewContent"></div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="previewDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="useTemplate(currentPreviewTemplate)">
            使用此模板
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { templateApi } from '@/api/template'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const templates = ref([])
const searchKeyword = ref('')
const selectedCategory = ref('')
const sortBy = ref('createdAt')
const currentPage = ref(1)
const pageSize = ref(12)
const total = ref(0)

// 上传相关
const uploadDialogVisible = ref(false)
const uploading = ref(false)
const uploadFormRef = ref()
const uploadRef = ref()
const uploadForm = reactive({
  name: '',
  category: '',
  description: '',
  file: null
})

// 预览相关
const previewDialogVisible = ref(false)
const currentPreviewTemplate = ref(null)
const previewLoading = ref(false)
const previewContent = ref('')

// 分类选项
const categories = [
  { value: 'employment', label: '劳动合同' },
  { value: 'purchase', label: '采购合同' },
  { value: 'sales', label: '销售合同' },
  { value: 'lease', label: '租赁合同' },
  { value: 'service', label: '服务合同' },
  { value: 'nda', label: '保密协议' },
  { value: 'other', label: '其他合同' }
]

// 表单验证规则
const uploadRules = {
  name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择模板分类', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入模板描述', trigger: 'blur' }
  ],
  file: [
    { required: true, message: '请选择模板文件', trigger: 'change' }
  ]
}

// 计算属性
const filteredTemplates = computed(() => {
  let result = [...templates.value]
  
  // 搜索过滤
  if (searchKeyword.value) {
    result = result.filter(template =>
      template.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
      template.description.toLowerCase().includes(searchKeyword.value.toLowerCase())
    )
  }
  
  // 分类过滤
  if (selectedCategory.value) {
    result = result.filter(template => template.category === selectedCategory.value)
  }
  
  // 排序
  result.sort((a, b) => {
    switch (sortBy.value) {
      case 'useCount':
        return (b.useCount || 0) - (a.useCount || 0)
      case 'rating':
        return (b.rating || 0) - (a.rating || 0)
      default:
        return new Date(b.createdAt) - new Date(a.createdAt)
    }
  })
  
  return result
})

// 获取分类名称
const getCategoryName = (category) => {
  const item = categories.find(c => c.value === category)
  return item ? item.label : category
}

// 获取模板列表
const fetchTemplates = async () => {
  try {
    loading.value = true
    const response = await templateApi.getTemplates({
      page: currentPage.value,
      pageSize: pageSize.value,
      category: selectedCategory.value,
      search: searchKeyword.value,
      sortBy: sortBy.value
    })
    
    templates.value = response.data || []
    total.value = response.total || 0
  } catch (error) {
    ElMessage.error('获取模板列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = (value) => {
  currentPage.value = 1
  fetchTemplates()
}

// 分类变更
const handleCategoryChange = () => {
  currentPage.value = 1
  fetchTemplates()
}

// 排序处理
const handleSort = () => {
  fetchTemplates()
}

// 分页处理
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchTemplates()
}

const handleCurrentChange = (page) => {
  currentPage.value = page
  fetchTemplates()
}

// 显示上传对话框
const showUploadDialog = () => {
  uploadDialogVisible.value = true
}

// 重置上传表单
const resetUploadForm = () => {
  uploadForm.name = ''
  uploadForm.category = ''
  uploadForm.description = ''
  uploadForm.file = null
  uploadFormRef.value?.resetFields()
  uploadRef.value?.clearFiles()
}

// 文件选择处理
const handleFileChange = (file) => {
  uploadForm.file = file.raw
}

// 文件移除处理
const handleFileRemove = () => {
  uploadForm.file = null
}

// 提交上传
const submitUpload = async () => {
  if (!uploadFormRef.value) return
  
  try {
    await uploadFormRef.value.validate()
    
    uploading.value = true
    const formData = new FormData()
    formData.append('name', uploadForm.name)
    formData.append('category', uploadForm.category)
    formData.append('description', uploadForm.description)
    formData.append('file', uploadForm.file)
    
    await templateApi.uploadTemplate(formData)
    
    ElMessage.success('模板上传成功')
    uploadDialogVisible.value = false
    fetchTemplates()
  } catch (error) {
    if (error.message) {
      ElMessage.error(error.message)
    }
  } finally {
    uploading.value = false
  }
}

// 使用模板
const useTemplate = (template) => {
  router.push({
    name: 'ContractCreate',
    query: { templateId: template.id }
  })
}

// 预览模板
const handlePreviewTemplate = async (template) => {
  try {
    previewDialogVisible.value = true
    currentPreviewTemplate.value = template
    previewLoading.value = true
    
    const response = await templateApi.previewTemplate(template.id)
    previewContent.value = response.content
  } catch (error) {
    ElMessage.error('预览失败')
  } finally {
    previewLoading.value = false
  }
}

// 生命周期
onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped>
.template-library {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.filter-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.template-grid {
  margin-bottom: 24px;
}

.template-item {
  margin-bottom: 20px;
}

.template-card {
  height: 100%;
  transition: transform 0.3s;
}

.template-card:hover {
  transform: translateY(-2px);
}

.template-preview {
  height: 180px;
  overflow: hidden;
  border-radius: 4px;
  margin-bottom: 16px;
}

.preview-image {
  width: 100%;
  height: 100%;
  display: block;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f5f7fa;
  color: #c0c4cc;
}

.template-info {
  padding: 0 8px;
}

.template-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #303133;
  line-height: 1.4;
}

.template-desc {
  margin: 0 0 12px 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.use-count {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-size: 12px;
}

.template-rating {
  margin-bottom: 16px;
}

.template-actions {
  display: flex;
  gap: 8px;
}

.pagination-section {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.preview-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 20px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.el-upload__tip {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
}
</style>