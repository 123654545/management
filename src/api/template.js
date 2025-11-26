import request from './request'

export const templateApi = {
  // 获取模板列表
  getTemplates: async (params = {}) => {
    try {
      const response = await request.get('/templates', { params })
      return response
    } catch (error) {
      throw error
    }
  },

  // 获取模板详情
  getTemplate: async (id) => {
    try {
      const response = await request.get(`/templates/${id}`)
      return response
    } catch (error) {
      throw error
    }
  },

  // 上传模板
  uploadTemplate: async (formData) => {
    try {
      const response = await request.post('/templates', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response
    } catch (error) {
      throw error
    }
  },

  // 预览模板
  previewTemplate: async (id) => {
    try {
      const response = await request.get(`/templates/${id}/preview`)
      return response
    } catch (error) {
      throw error
    }
  },

  // 使用模板创建合同
  useTemplate: async (id, contractData) => {
    try {
      const response = await request.post(`/templates/${id}/use`, contractData)
      return response
    } catch (error) {
      throw error
    }
  },

  // 删除模板
  deleteTemplate: async (id) => {
    try {
      const response = await request.delete(`/templates/${id}`)
      return response
    } catch (error) {
      throw error
    }
  },

  // 更新模板信息
  updateTemplate: async (id, data) => {
    try {
      const response = await request.put(`/templates/${id}`, data)
      return response
    } catch (error) {
      throw error
    }
  },

  // 获取模板分类
  getCategories: async () => {
    try {
      const response = await request.get('/templates/categories')
      return response
    } catch (error) {
      throw error
    }
  },

  // 模板评分
  rateTemplate: async (id, rating) => {
    try {
      const response = await request.post(`/templates/${id}/rate`, { rating })
      return response
    } catch (error) {
      throw error
    }
  }
}