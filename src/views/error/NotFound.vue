<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <div class="error-image">
        <el-icon size="120" color="#409EFF">
          <DocumentRemove />
        </el-icon>
      </div>
      <h1>404</h1>
      <h2>页面不存在</h2>
      <p>抱歉，您访问的页面不存在或已被移除。</p>
      <el-button type="primary" @click="$router.push('/dashboard')">
        返回首页
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { DocumentRemove } from '@element-plus/icons-vue'
</script>

<style scoped>
.not-found-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
}

.not-found-content {
  text-align: center;
  max-width: 400px;
}

.error-image {
  margin-bottom: 20px;
}

.not-found-content h1 {
  font-size: 72px;
  font-weight: 700;
  color: #409EFF;
  margin: 0 0 16px 0;
}

.not-found-content h2 {
  font-size: 24px;
  color: #303133;
  margin: 0 0 16px 0;
  font-weight: 600;
}

.not-found-content p {
  color: #606266;
  margin: 0 0 32px 0;
  line-height: 1.6;
}
</style>