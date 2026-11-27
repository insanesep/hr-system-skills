<template>
  <div>
    <el-tabs v-model="tab">
      <!-- ========== 编制台账 ========== -->
      <el-tab-pane label="编制台账" name="ledger">
        <el-row :gutter="12" style="margin-bottom:12px">
          <el-col :span="4" v-for="c in statCards" :key="c.label">
            <el-card shadow="hover" class="stat-card">
              <div class="label">{{ c.label }}</div>
              <div class="value" :style="{ color: c.color }">{{ c.value }}</div>
            </el-card>
          </el-col>
        </el-row>

        <el-card shadow="never">
          <div class="toolbar">
            <el-input v-model="query.keyword" placeholder="编制编号 / 职位 / 部门" clearable style="width:200px" @change="load(1)" />
            <el-select v-model="query.estStatus" placeholder="编制状态" clearable style="width:120px" @change="load(1)">
              <el-option v-for="s in ['待审批','生效中','已驳回','已停用','已结束']" :key="s" :label="s" :value="s" />
            </el-select>
            <el-select v-model="query.empType" placeholder="用工形式" clearable style="width:140px" @change="load(1)">
              <el-option v-for="s in ['全职-正式','实习生','劳务外包','兼职PT']" :key="s" :label="s" :value="s" />
            </el-select>
            <el-select v-model="query.estPlanType" placeholder="编制计划" clearable style="width:120px" @change="load(1)">
              <el-option v-for="s in ['新增','保留','调出','划拨']" :key="s" :label="s" :value="s" />
            </el-select>
            <el-button type="primary" @click="openCreate">新增编制</el-button>
          </div>

          <el-table :data="list" border v-loading="loading">
            <el-table-column prop="estNo" label="编制编号" width="130" />
            <el-table-column prop="deptPath" label="组织" min-width="220" show-overflow-tooltip />
            <el-table-column prop="positionName" label="职位" width="150" />
            <el-table-column prop="jobLevel" label="职级" width="70" />
            <el-table-column prop="empType" label="用工形式" width="100" />
            <el-table-column prop="estPlanType" label="计划" width="70" />
            <el-table-column prop="quota" label="编制数" width="80" align="right" />
            <el-table-column prop="incumbent" label="在编" width="70" align="right" />
            <el-table-column prop="recruitHold" label="占用" width="70" align="right" />
            <el-table-column label="可用缺额" width="90" align="right">
              <template #default="{ row }">
                <span :style="{ color: row.vacancy < 0 ? '#f56c6c' : '#67c23a', fontWeight: 600 }">{{ row.vacancy }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="estStatus" label="状态" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="statusType(row.estStatus)">{{ row.estStatus }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="230" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.estStatus === '生效中'" link type="primary" @click="openAdjust(row)">调整</el-button>
                <el-button v-if="row.estStatus === '待审批'" link type="success" @click="openApprove(row)">审批</el-button>
                <el-button v-if="row.estStatus === '生效中'" link type="warning" @click="onToggle(row, false)">停用</el-button>
                <el-button v-if="row.estStatus === '已停用'" link type="success" @click="onToggle(row, true)">启用</el-button>
                <el-button link @click="openDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                         :total="total" v-model:current-page="query.pageNum" :page-size="query.pageSize" @current-change="load()" />
        </el-card>
      </el-tab-pane>

      <!-- ========== 外包超编 ========== -->
      <el-tab-pane label="外包超编" name="outsource">
        <el-card shadow="never">
          <el-alert type="warning" :closable="false" title="劳务外包且可用缺额 &lt; 0 的专项编制行" style="margin-bottom:12px" />
          <el-table :data="outsourceList" border>
            <el-table-column prop="estNo" label="编制编号" width="130" />
            <el-table-column prop="deptPath" label="组织" min-width="220" show-overflow-tooltip />
            <el-table-column prop="positionName" label="职位" width="150" />
            <el-table-column prop="quota" label="编制数" width="80" align="right" />
            <el-table-column prop="incumbent" label="在编" width="80" align="right" />
            <el-table-column label="可用缺额" width="100" align="right">
              <template #default="{ row }"><span style="color:#f56c6c;font-weight:600">{{ row.vacancy }}</span></template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button link type="primary" @click="openAdjust(row)">调整编制</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!outsourceList.length" description="暂无外包超编" />
        </el-card>
      </el-tab-pane>

      <!-- ========== 编制规划 ========== -->
      <el-tab-pane label="编制规划" name="plan">
        <el-card shadow="never">
          <div class="toolbar">
            <el-select v-model="planYear" style="width:120px" @change="loadPlans">
              <el-option v-for="y in [2025, 2026, 2027]" :key="y" :label="y + ' 年'" :value="y" />
            </el-select>
          </div>
          <el-table :data="plans" border>
            <el-table-column prop="orgName" label="组织" width="160" />
            <el-table-column prop="levelCategory" label="职级类别" width="120" />
            <el-table-column prop="marchHeadcount" label="3月在职" width="90" align="right" />
            <el-table-column prop="originQuota" label="原编制数" width="90" align="right" />
            <el-table-column label="本次调整" width="120">
              <template #default="{ row }">
                <el-input-number v-model="row.adjustQuota" :min="-50" :max="50" size="small" @change="row._dirty = true" />
              </template>
            </el-table-column>
            <el-table-column prop="targetQuota" label="目标编制" width="90" align="right" />
            <el-table-column label="达成率" width="90" align="right">
              <template #default="{ row }">{{ row.achieveRate == null ? '—' : row.achieveRate + '%' }}</template>
            </el-table-column>
            <el-table-column label="调整原因" min-width="160">
              <template #default="{ row }">
                <el-input v-model="row.adjustReason" size="small" placeholder="调整必填" @input="row._dirty = true" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="90">
              <template #default="{ row }">
                <el-button link type="primary" :disabled="!row._dirty" @click="onSavePlan(row)">保存</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 新增编制 -->
    <el-dialog v-model="createDialog" title="新增编制" width="560px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="编制计划" required>
          <el-radio-group v-model="createForm.estPlanType">
            <el-radio value="新增">新增（需审批）</el-radio><el-radio value="保留">保留</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="年度" required><el-input-number v-model="createForm.year" :min="2024" :max="2030" /></el-form-item>
        <el-form-item label="组织" required>
          <el-cascader v-model="createDeptPath" :options="deptTree" :props="{ label: 'deptName', value: 'id' }"
                       style="width:100%" @change="onCreateDeptChange" />
        </el-form-item>
        <el-form-item label="职位" required>
          <el-select v-model="createForm.positionId" style="width:100%" @change="onCreatePosChange">
            <el-option v-for="p in positionOptions" :key="p.id" :label="`${p.positionName}（${p.defaultLevel || ''}）`" :value="Number(p.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="用工形式" required>
          <el-select v-model="createForm.empType">
            <el-option v-for="s in ['全职-正式','实习生','劳务外包','兼职PT']" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="编制数量" required><el-input-number v-model="createForm.quota" :min="1" :max="9999" /></el-form-item>
        <el-form-item label="编制起止" required>
          <el-date-picker v-model="createRange" type="daterange" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog = false">取消</el-button>
        <el-button type="primary" @click="onCreate">提交</el-button>
      </template>
    </el-dialog>

    <!-- 调整 -->
    <el-dialog v-model="adjustDialog" title="调整编制" width="440px">
      <el-alert :type="adjustForm.newQuota > current?.quota ? 'warning' : 'info'" :closable="false" style="margin-bottom:12px"
                :title="adjustForm.newQuota > current?.quota ? '调增需一级中心负责人审批' : '调减直接生效'" />
      <el-form label-width="90px">
        <el-form-item label="当前编制">{{ current?.quota }}</el-form-item>
        <el-form-item label="新编制数"><el-input-number v-model="adjustForm.newQuota" :min="0" :max="9999" /></el-form-item>
        <el-form-item label="调整原因"><el-input v-model="adjustForm.reason" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustDialog = false">取消</el-button>
        <el-button type="primary" @click="onAdjust">提交</el-button>
      </template>
    </el-dialog>

    <!-- 审批 -->
    <el-dialog v-model="approveDialog" title="编制审批" width="440px">
      <p style="margin-bottom:12px">{{ current?.estNo }} · {{ current?.positionName }} · 编制数 {{ current?.quota }}</p>
      <el-input v-model="approveReason" type="textarea" :rows="2" placeholder="审批意见" />
      <template #footer>
        <el-button type="danger" @click="onApprove(false)">驳回</el-button>
        <el-button type="primary" @click="onApprove(true)">通过</el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailDrawer" :title="current?.estNo" size="560px">
      <el-tabs v-if="current">
        <el-tab-pane label="编制信息">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="组织" :span="2">{{ current.deptPath }}</el-descriptions-item>
            <el-descriptions-item label="职位">{{ current.positionName }}</el-descriptions-item>
            <el-descriptions-item label="职级">{{ current.jobLevel }}</el-descriptions-item>
            <el-descriptions-item label="编制数">{{ current.quota }}</el-descriptions-item>
            <el-descriptions-item label="在编">{{ current.incumbent }}</el-descriptions-item>
            <el-descriptions-item label="占用">{{ current.recruitHold }}</el-descriptions-item>
            <el-descriptions-item label="可用缺额">{{ current.vacancy }}</el-descriptions-item>
            <el-descriptions-item label="编制起止">{{ current.startDate }} ~ {{ current.endDate }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ current.estStatus }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <el-tab-pane label="在编人员">
          <el-table :data="incumbents" border size="small">
            <el-table-column prop="empNo" label="工号" width="90" />
            <el-table-column prop="empName" label="姓名" width="90" />
            <el-table-column prop="source" label="来源" width="110" />
            <el-table-column prop="confirmStatus" label="确认状态" width="110">
              <template #default="{ row }">
                <el-tag size="small" :type="row.confirmStatus === '已确认' ? 'success' : 'warning'">{{ row.confirmStatus }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作">
              <template #default="{ row }">
                <el-button v-if="row.confirmStatus === '待编制确认'" link type="primary" @click="onConfirmInc(row)">确认</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="变更记录">
          <el-timeline>
            <el-timeline-item v-for="log in logs" :key="log.id" :timestamp="log.createTime" placement="top">
              <b>{{ log.changeType }}</b>
              <span v-if="log.beforeValue"> {{ log.beforeValue }} → {{ log.afterValue }}</span>
              <div style="color:#999;font-size:12px">{{ log.operator }}<span v-if="log.reason"> · {{ log.reason }}</span></div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-if="!logs.length" description="暂无变更记录" :image-size="60" />
        </el-tab-pane>
      </el-tabs>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getEstPage, getEstStats, createEst, adjustEst, approveEst, toggleEst, getOutsourceOver,
         getIncumbents, confirmIncumbent, getEstLogs, getEstPlans, saveEstPlan } from '../../api/est'
import { getDeptTree, getPositions } from '../../api/org'

const tab = ref('ledger')
const list = ref([])
const total = ref(0)
const loading = ref(false)
const stats = ref({})
const query = ref({ keyword: '', estStatus: '', empType: '', estPlanType: '', pageNum: 1, pageSize: 10 })
const deptTree = ref([])
const positionOptions = ref([])

const statCards = computed(() => [
  { label: '编制总数', value: stats.value.quotaTotal ?? '—', color: '#1d2540' },
  { label: '在编人数', value: stats.value.incumbentTotal ?? '—', color: '#409eff' },
  { label: '招聘占用', value: stats.value.recruitHoldTotal ?? '—', color: '#e6a23c' },
  { label: '可用缺额', value: stats.value.vacancyTotal ?? '—', color: '#67c23a' },
  { label: '超编行', value: stats.value.overLines ?? '—', color: '#f56c6c' },
  { label: '待审批', value: stats.value.pendingApproval ?? '—', color: '#909399' }
])

function statusType(s) {
  return { 生效中: 'success', 待审批: 'warning', 已驳回: 'danger', 已停用: 'info', 已结束: 'info' }[s] || 'info'
}

async function load(reset) {
  if (reset) query.value.pageNum = 1
  loading.value = true
  try {
    const data = await getEstPage({ ...query.value, keyword: query.value.keyword || undefined, estStatus: query.value.estStatus || undefined, empType: query.value.empType || undefined, estPlanType: query.value.estPlanType || undefined })
    list.value = data.list
    total.value = data.total
    stats.value = await getEstStats()
  } finally {
    loading.value = false
  }
}

// 新增
const createDialog = ref(false)
const createForm = ref({})
const createDeptPath = ref(null)
const createRange = ref(null)

async function openCreate() {
  createForm.value = { estPlanType: '新增', year: new Date().getFullYear(), empType: '全职-正式', quota: 1 }
  createDeptPath.value = null
  createRange.value = [`${new Date().getFullYear()}-01-01`, `${new Date().getFullYear()}-12-31`]
  if (!deptTree.value.length) deptTree.value = await getDeptTree()
  if (!positionOptions.value.length) positionOptions.value = await getPositions({ status: '已启用' })
  createDialog.value = true
}

function findDept(nodes, id) {
  for (const n of nodes) {
    if (String(n.id) === String(id)) return n
    const r = findDept(n.children || [], id)
    if (r) return r
  }
  return null
}

function onCreateDeptChange(path) {
  const names = path.map(id => findDept(deptTree.value, id)?.deptName)
  createForm.value.deptLv1 = names[0]
  createForm.value.deptLv2 = names[1]
  createForm.value.deptLv3 = names[2]
  createForm.value.deptLv4 = names[3]
  createForm.value.deptId = Number(path[path.length - 1])
}

function onCreatePosChange(pid) {
  const p = positionOptions.value.find(x => Number(x.id) === pid)
  if (p) {
    createForm.value.positionName = p.positionName
    createForm.value.jobLevel = p.defaultLevel
  }
}

async function onCreate() {
  if (!createForm.value.deptId || !createForm.value.positionId) return ElMessage.warning('请选择组织与职位')
  createForm.value.startDate = createRange.value?.[0]
  createForm.value.endDate = createRange.value?.[1]
  await createEst(createForm.value)
  ElMessage.success(createForm.value.estPlanType === '新增' ? '已提交，待审批' : '创建成功')
  createDialog.value = false
  load(1)
}

// 调整
const adjustDialog = ref(false)
const adjustForm = ref({ newQuota: 0, reason: '' })
const current = ref(null)

function openAdjust(row) {
  current.value = row
  adjustForm.value = { newQuota: row.quota, reason: '' }
  adjustDialog.value = true
}

async function onAdjust() {
  await adjustEst(current.value.id, { newQuota: adjustForm.value.newQuota, reason: adjustForm.value.reason })
  ElMessage.success(adjustForm.value.newQuota > current.value.quota ? '调增已提交审批' : '调减已生效')
  adjustDialog.value = false
  load()
}

// 审批
const approveDialog = ref(false)
const approveReason = ref('')

function openApprove(row) {
  current.value = row
  approveReason.value = ''
  approveDialog.value = true
}

async function onApprove(pass) {
  await approveEst(current.value.id, { pass, reason: approveReason.value })
  ElMessage.success(pass ? '已通过' : '已驳回')
  approveDialog.value = false
  load()
}

// 启停
async function onToggle(row, enable) {
  await ElMessageBox.confirm(`确认${enable ? '启用' : '停用'}编制 ${row.estNo}？`, '提示', { type: 'warning' })
  await toggleEst(row.id, { enable, reason: '' })
  ElMessage.success('操作成功')
  load()
}

// 详情
const detailDrawer = ref(false)
const incumbents = ref([])
const logs = ref([])

async function openDetail(row) {
  current.value = row
  detailDrawer.value = true
  incumbents.value = await getIncumbents(row.id)
  logs.value = await getEstLogs(row.id)
}

async function onConfirmInc(row) {
  await confirmIncumbent(row.id, {})
  ElMessage.success('已确认')
  incumbents.value = await getIncumbents(current.value.id)
}

// 外包超编
const outsourceList = ref([])
async function loadOutsource() {
  outsourceList.value = await getOutsourceOver()
}

// 规划
const planYear = ref(2026)
const plans = ref([])
async function loadPlans() {
  plans.value = await getEstPlans(planYear.value)
}
async function onSavePlan(row) {
  if (row.adjustQuota !== 0 && !row.adjustReason) return ElMessage.warning('调整数不为 0 时须填写调整原因')
  await saveEstPlan({ id: Number(row.id), adjustQuota: row.adjustQuota, adjustReason: row.adjustReason })
  ElMessage.success('已保存')
  loadPlans()
}

onMounted(() => { load(); loadOutsource(); loadPlans() })
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.stat-card .label { font-size: 12px; color: #999; }
.stat-card .value { font-size: 24px; font-weight: 600; margin-top: 6px; }
</style>
