import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { contractApi } from '@/api/contract'

export const useContractStore = defineStore('contract', () => {
  // 状态
  const contracts = ref([])
  const currentContract = ref(null)
  const currentAnalysis = ref(null)
  const loading = ref(false)
  const uploading = ref(false)
  const analyzing = ref(false)

  // 计算属性
  const contractsCount = computed(() => contracts.value.length)
  
  const recentContracts = computed(() => 
    contracts.value
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
      .slice(0, 6)
  )

  // 方法
  const fetchContracts = async () => {
    try {
      loading.value = true
      const response = await contractApi.getContracts()
      contracts.value = response.contracts || []
      return response
    } catch (error) {
      console.error('获取合同列表失败:', error)
      // 如果是认证错误，直接抛出，由路由守卫处理
      if (error.response?.status === 401) {
        throw error
      }
      // 其他错误显示友好提示
      throw new Error('获取合同列表失败，请检查网络连接')
    } finally {
      loading.value = false
    }
  }

  const uploadContract = async (file) => {
    try {
      uploading.value = true
      const response = await contractApi.uploadContract(file)
      
      // 添加到列表
      contracts.value.unshift(response)
      
      // 上传成功后自动触发合同分析
      if (response.id) {
        // 不等待分析完成，避免阻塞用户体验
        analyzeContract(response.id).catch(err => {
          console.warn('自动分析触发失败:', err)
        })
      }
      
      return response
    } catch (error) {
      throw error
    } finally {
      uploading.value = false
    }
  }

  const getContract = async (id) => {
    try {
      loading.value = true
      
      // 首先获取合同基本信息
      const contract = await contractApi.getContract(id)
      currentContract.value = contract
      
      // 然后尝试获取分析数据，但即使失败也不影响合同详情显示
      try {
        const analysis = await contractApi.getContractAnalysis(id)
        currentAnalysis.value = analysis
      } catch (analysisError) {
        console.warn('获取合同分析数据失败，将显示默认状态:', analysisError.message)
        // 设置默认分析状态，而不是错误状态
        currentAnalysis.value = { 
          analysis_status: 'pending',
          message: '分析数据暂不可用'
        }
      }
      
      return { contract, analysis: currentAnalysis.value }
    } catch (error) {
      console.error('获取合同详情失败:', error)
      // 合同基本信息获取失败才清空当前合同
      currentContract.value = null
      currentAnalysis.value = { analysis_status: 'pending' }
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateContract = async (id, data) => {
    try {
      loading.value = true
      const updatedContract = await contractApi.updateContract(id, data)
      
      // 更新列表中的合同
      const index = contracts.value.findIndex(c => c.id === id)
      if (index !== -1) {
        contracts.value[index] = updatedContract
      }
      
      // 更新当前合同
      if (currentContract.value?.id === id) {
        currentContract.value = updatedContract
      }
      
      return updatedContract
    } catch (error) {
      throw error
    } finally {
      loading.value = false
    }
  }

  const deleteContract = async (id) => {
    try {
      loading.value = true
      await contractApi.deleteContract(id)
      
      // 从列表中移除
      contracts.value = contracts.value.filter(c => c.id !== id)
      
      // 清空当前合同和分析结果
      if (currentContract.value?.id === id) {
        currentContract.value = null
        currentAnalysis.value = null
      }
    } catch (error) {
      throw error
    } finally {
      loading.value = false
    }
  }

  const analyzeContract = async (id) => {
    try {
      analyzing.value = true
      const analysis = await contractApi.analyzeContract(id)
      
      if (currentContract.value?.id === id) {
        currentAnalysis.value = analysis
      }
      
      return analysis
    } catch (error) {
      throw error
    } finally {
      analyzing.value = false
    }
  }

  const retryAnalysis = async (id) => {
    try {
      await analyzeContract(id)
    } catch (error) {
      throw error
    }
  }

  const clearCurrent = () => {
    currentContract.value = null
    currentAnalysis.value = null
  }

  return {
    // 状态
    contracts,
    currentContract,
    currentAnalysis,
    loading,
    uploading,
    analyzing,
    // 计算属性
    contractsCount,
    recentContracts,
    // 方法
    fetchContracts,
    uploadContract,
    getContract,
    updateContract,
    deleteContract,
    analyzeContract,
    retryAnalysis,
    clearCurrent
  }
})