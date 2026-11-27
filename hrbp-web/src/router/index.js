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
      { path: 'hr/recruit/dashboard', component: () => import('../views/recruit/DashboardPage.vue'), meta: { title: '招聘数据看板' } },
      { path: 'hr/onboarding/list', component: () => import('../views/flow/OnboardingPage.vue'), meta: { title: '入职管理' } },
      { path: 'hr/regularization/list', component: () => import('../views/flow/RegularizationPage.vue'), meta: { title: '转正管理' } },
      { path: 'hr/movement/list', component: () => import('../views/flow/MovementPage.vue'), meta: { title: '调岗晋升' } },
      { path: 'hr/offboarding/list', component: () => import('../views/flow/OffboardingPage.vue'), meta: { title: '离职管理' } },
      { path: 'hr/contract/list', component: () => import('../views/flow/ContractPage.vue'), meta: { title: '合同管理' } },
      { path: 'hr/growth/list', component: () => import('../views/flow/GrowthPage.vue'), meta: { title: '员工成长记录' } },
      { path: 'hr/attendance/list', component: () => import('../views/att/AttendancePage.vue'), meta: { title: '考勤管理' } },
      { path: 'hr/performance/target', component: () => import('../views/perf/TargetPage.vue'), meta: { title: '绩效目标管理' } },
      { path: 'hr/performance/review', component: () => import('../views/perf/ReviewPage.vue'), meta: { title: '绩效评价' } },
      { path: 'hr/performance/calibration', component: () => import('../views/perf/CalibrationPage.vue'), meta: { title: '绩效通晒' } },
      { path: 'hr/performance/config', component: () => import('../views/perf/ConfigPage.vue'), meta: { title: '绩效参数配置' } },
      { path: 'hr/talent/list', component: () => import('../views/talent/TalentInfoPage.vue'), meta: { title: '人才信息' } },
      { path: 'hr/talent-review/list', component: () => import('../views/talent/NineBoxPage.vue'), meta: { title: '人才盘点九宫格' } },
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
