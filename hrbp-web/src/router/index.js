import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'

const routes = [
  { path: '/login', component: () => import('../views/login/LoginPage.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('../layout/AdminLayout.vue'),
    redirect: '/hr/workbench',
    children: [
      { path: 'hr/workbench', component: () => import('../views/workbench/WorkbenchPage.vue'), meta: { title: '工作台' } },
      // 后续业务模块页面按任务逐个挂载
      { path: ':pathMatch(.*)*', component: () => import('../layout/NotFound.vue') }
    ]
  }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach(async to => {
  const auth = useAuthStore()
  if (to.meta.public) return true
  if (!auth.token) return '/login'
  if (!auth.userInfo) {
    try {
      await auth.fetchUser()
    } catch {
      return '/login'
    }
  }
  return true
})

export default router
