import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 路由配置
const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: {
      title: '用户登录',
      requiresAuth: false
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/Register.vue'),
    meta: {
      title: '用户注册',
      requiresAuth: false
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/contract/Dashboard.vue'),
    meta: {
      title: '合同管理',
      requiresAuth: true
    }
  },
  {
    path: '/contract/:id',
    name: 'ContractDetail',
    component: () => import('@/views/contract/ContractDetail.vue'),
    meta: {
      title: '合同详情',
      requiresAuth: true
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/user/Profile.vue'),
    meta: {
      title: '个人资料',
      requiresAuth: true
    }
  },
  {
    path: '/templates',
    name: 'TemplateLibrary',
    component: () => import('@/views/template/TemplateLibrary.vue'),
    meta: {
      title: '合同模板库',
      requiresAuth: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/NotFound.vue'),
    meta: {
      title: '页面不存在',
      requiresAuth: false
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  const token = localStorage.getItem('token')

  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 智能合同管理系统`
  }

  // 检查是否需要登录
  if (to.meta.requiresAuth) {
    if (!token) {
      next({
        name: 'Login',
        query: { redirect: to.fullPath }
      })
      return
    }

    // 如果有token但未获取用户信息，则获取用户信息
    if (!userStore.isAuthenticated) {
      try {
        await userStore.getUserInfo()
      } catch (error) {
        // token无效，清除本地存储并跳转登录页
        localStorage.removeItem('token')
        next({
          name: 'Login',
          query: { redirect: to.fullPath }
        })
        return
      }
    }
  }

  // 如果已登录用户访问登录/注册页，跳转到首页
  if (token && userStore.isAuthenticated && (to.name === 'Login' || to.name === 'Register')) {
    next({ name: 'Dashboard' })
    return
  }

  next()
})

export default router