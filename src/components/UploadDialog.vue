<template>
  <el-dialog
    v-model="visible"
    title="上传合同"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="upload-content">
      <el-upload
        ref="uploadRef"
        class="upload-dragger"
        drag
        :auto-upload="false"
        :limit="1"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
        :file-list="fileList"
        accept=".pdf,.docx"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            <div class="file-formats">
              <h4>支持的文件格式：</h4>
              <ul>
                <li><strong>PDF 文档</strong> (.pdf)</li>
                <li><strong>Word 文档</strong> (.docx)</li>
              </ul>
              <div class="file-limit">
                <el-icon><WarningFilled /></el-icon>
                文件大小限制：最大 20MB
              </div>
            </div>
          </div>
        </template>
      </el-upload>

      <!-- 上传进度 -->
      <div v-if="uploading" class="upload-progress">
        <el-progress
          :percentage="progress"
          :stroke-width="8"
          status="success"
        />
        <p class="progress-text">
          {{ progress < 100 ? '上传中...' : '上传完成，正在分析...' }}
        </p>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :loading="uploading"
        :disabled="!currentFile"
        @click="handleUpload"
      >
        {{ uploading ? '上传中...' : '开始上传' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Warning } from '@element-plus/icons-vue'
import { useContractStore } from '@/stores/contract'
import { useUpload } from '@/composables/useUpload'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const contractStore = useContractStore()
const { uploading, progress, uploadFile } = useUpload()

const uploadRef = ref()
const fileList = ref([])
const currentFile = ref(null)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    resetForm()
  }
})

const handleFileChange = (file) => {
  if (file.raw) {
    currentFile.value = file.raw
    fileList.value = [file]
  }
}

const handleFileRemove = () => {
  currentFile.value = null
  fileList.value = []
}

const handleUpload = async () => {
  if (!currentFile.value) {
    ElMessage.warning('请选择要上传的文件')
    return
  }

  try {
    await uploadFile(
      async (file, onProgress) => {
        const result = await contractStore.uploadContract(file)
        onProgress?.(100)
        return result
      },
      currentFile.value
    )

    emit('success')
    resetForm()
  } catch (error) {
    console.error('上传失败:', error)
  }
}

const handleClose = () => {
  if (!uploading.value) {
    visible.value = false
  }
}

const resetForm = () => {
  fileList.value = []
  currentFile.value = null
  uploadRef.value?.clearFiles()
}
</script>

<style scoped>
.upload-content {
  text-align: center;
}

.upload-dragger {
  width: 100%;
}

.upload-progress {
  margin-top: 20px;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.progress-text {
  margin-top: 12px;
  color: #606266;
  font-size: 14px;
}

:deep(.el-upload-dragger) {
  width: 100%;
}

:deep(.el-upload__tip) {
  margin-top: 8px;
}

.file-formats {
  text-align: left;
  width: 100%;
}

.file-formats h4 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

.file-formats ul {
  margin: 0 0 12px 0;
  padding-left: 20px;
  list-style: none;
}

.file-formats li {
  margin-bottom: 4px;
  color: #606266;
  font-size: 12px;
}

.file-formats li strong {
  color: #409EFF;
}

.file-limit {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;
  color: #f56c6c;
  font-size: 12px;
  margin-top: 8px;
}
</style>