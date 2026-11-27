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
      { path: 'hr/department/tree', component: () => import('../views/org/DepartmentPage.vue'), meta: { title: '部门管理' } },
      { path: 'hr/position/list', component: () => import('../views/org/PositionPage.vue'), meta: { title: '岗位管理' } },
      { path: 'hr/establishment/list', component: () => import('../views/org/EstablishmentPage.vue'), meta: { title: '编制管理' } },
      { path: 'hr/recruit/demand/list', component: () => import('../views/recruit/DemandListPage.vue'), meta: { title: '招聘需求管理' } },
      { path: 'hr/recruit/workbench', component: () => import('../views/recruit/ProcessPage.vue'), meta: { title: '招聘过程管理' } },
      { path: 'hr/employee/list', component: () => import('../views/employee/EmployeeListPage.vue'), meta: { title: '员工资料' } },
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
