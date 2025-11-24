import request from './request'

export const contractApi = {
  // 获取合同列表
  getContracts: async () => {
    return request.get('/contracts')
  },

  // 获取单个合同
  getContract: async (id) => {
    return request.get(`/contracts/${id}`)
  },

  // 上传合同
  uploadContract: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    
    return request.post('/contracts/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 更新合同
  updateContract: async (id, data) => {
    return request.put(`/contracts/${id}`, data)
  },

  // 删除合同
  deleteContract: async (id) => {
    return request.delete(`/contracts/${id}`)
  },

  // 获取合同分析结果
  getContractAnalysis: async (id) => {
    return request.get(`/analysis/contract/${id}`)
  },

  // 分析合同
  analyzeContract: async (id) => {
    return request.post(`/analysis/contract/${id}/analyze`)
  },

  // 重新分析合同
  reanalyzeContract: async (id) => {
    return request.post(`/analysis/contract/${id}/retry`)
  },

  // 下载合同文件
  downloadContract: async (id) => {
    return request.get(`/contracts/${id}/download`, {
      responseType: 'blob'
    })
  },

  // 导出日历
  exportCalendar: async (id, dateIds) => {
    return request.post(`/analysis/contract/${id}/calendar`, { dateIds }, {
      responseType: 'blob'
    })
  }
}