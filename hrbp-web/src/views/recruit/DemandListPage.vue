<template>
  <div>
    <el-row :gutter="12" style="margin-bottom:12px">
      <el-col :span="4" v-for="c in statCards" :key="c.label">
        <el-card shadow="hover" class="stat-card">
          <div class="label">{{ c.label }}</div>
          <div class="value" :style="{ color: c.color }">{{ c.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <el-tabs v-model="tab" @tab-change="load(1)">
        <el-tab-pane label="正式需求" name="normal" />
        <el-tab-pane label="外包需求" name="outsource" />
      </el-tabs>
      <div class="toolbar">
        <el-input v-model="query.keyword" placeholder="需求编号 / 职位" clearable style="width:180px" @change="load(1)" />
        <el-select v-model="query.demandStatus" placeholder="需求状态" clearable style="width:120px" @change="load(1)">
          <el-option v-for="s in ['草稿','待审批','招聘中','已完成','已关闭']" :key="s" :label="s" :value="s" />
        </el-select>
        <el-select v-model="query.jobCategory" placeholder="岗位类别" clearable style="width:120px" @change="load(1)">
          <el-option v-for="s in ['关键','S1','S2','A']" :key="s" :label="s" :value="s" />
        </el-select>
        <el-select v-model="query.quarter" placeholder="招聘季度" clearable style="width:120px" @change="load(1)">
          <el-option v-for="q in ['2025Q4','2026Q1','2026Q2','2026Q3','2026Q4']" :key="q" :label="q" :value="q" />
        </el-select>
        <el-button type="primary" @click="openCreate">新建需求</el-button>
      </div>

      <el-table :data="list" border v-loading="loading" @row-click="openDetail" style="cursor:pointer">
        <el-table-column prop="demandNo" label="需求编号" width="125" />
        <el-table-column prop="deptPath" label="组织" min-width="200" show-overflow-tooltip />
        <el-table-column prop="positionName" label="职位" width="150" />
        <el-table-column prop="jobLevel" label="职级" width="65" />
        <el-table-column prop="jobCategory" label="类别" width="65" />
        <el-table-column prop="headcount" label="需求" width="60" align="right" />
        <el-table-column prop="arrived" label="到岗" width="60" align="right" />
        <el-table-column label="缺口" width="60" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.gap > 0 ? '#e6a23c' : '#67c23a', fontWeight: 600 }">{{ row.gap }}</span>
          </template>
        </el-table-column>
        <el-table-column label="招聘天数" width="85" align="right">
          <template #default="{ row }">{{ row.recruitDays }} 天</template>
        </el-table-column>
        <el-table-column label="预警" width="85">
          <template #default="{ row }">
            <el-tag v-if="row.alertLevel !== '正常'" size="small" :type="row.alertLevel === '需升级' ? 'danger' : 'warning'">{{ row.alertLevel }}</el-tag>
            <span v-else style="color:#bbb">正常</span>
          </template>
        </el-table-column>
        <el-table-column prop="expectDate" label="期望到岗" width="100" />
        <el-table-column prop="demandStatus" label="状态" width="85">
          <template #default="{ row }">
            <el-tag size="small" :type="statusType(row.demandStatus)">{{ row.demandStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <span @click.stop>
              <el-button v-if="row.demandStatus === '草稿'" link type="primary" @click="onSubmit(row)">提交</el-button>
              <el-button v-if="row.demandStatus === '待审批'" link type="success" @click="openApprove(row)">审批</el-button>
              <el-button v-if="['草稿','招聘中'].includes(row.demandStatus)" link type="danger" @click="onClose(row)">关闭</el-button>
              <el-button link @click="openDetail(row)">详情</el-button>
            </span>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                     :total="total" v-model:current-page="query.pageNum" :page-size="query.pageSize" @current-change="load()" />
    </el-card>

    <!-- 新建需求 -->
    <el-dialog v-model="createDialog" title="新建招聘需求" width="580px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="关联编制行">
          <el-select v-model="createForm.estLineId" style="width:100%" placeholder="选择生效中的编制行（自动带出组织与职位）" @change="onEstChange">
            <el-option v-for="e in estOptions" :key="e.id" :value="Number(e.id)"
                       :label="`${e.estNo}｜${e.positionName}｜${e.deptPath}｜缺额 ${e.vacancy}`" />
          </el-select>
        </el-form-item>
        <el-form-item label="职位" required><el-input v-model="createForm.positionName" /></el-form-item>
        <el-form-item label="需求人数" required><el-input-number v-model="createForm.headcount" :min="1" :max="999" /></el-form-item>
        <el-form-item label="招聘季度" required>
          <el-select v-model="createForm.recruitQuarter">
            <el-option v-for="q in ['2026Q1','2026Q2','2026Q3','2026Q4']" :key="q" :label="q" :value="q" />
          </el-select>
        </el-form-item>
        <el-form-item label="岗位类别">
          <el-select v-model="createForm.jobCategory">
            <el-option v-for="s in ['关键','S1','S2','A']" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="用工形式" required>
          <el-select v-model="createForm.empType">
            <el-option v-for="s in ['全职-正式','实习生','劳务外包','兼职PT']" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="期望到岗">
          <el-date-picker v-model="createForm.expectDate" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="业务终面人"><el-input v-model="createForm.finalInterviewer" /></el-form-item>
        <el-form-item label="招聘负责人"><el-input v-model="createForm.recruitOwner" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog = false">取消</el-button>
        <el-button type="primary" @click="onCreate">创建（草稿）</el-button>
      </template>
    </el-dialog>

    <!-- 审批 -->
    <el-dialog v-model="approveDialog" title="需求审批" width="440px">
      <p style="margin-bottom:12px">{{ current?.demandNo }} · {{ current?.positionName }} · {{ current?.headcount }} 人</p>
      <el-input v-model="approveReason" type="textarea" :rows="2" placeholder="审批意见" />
      <template #footer>
        <el-button type="danger" @click="onApprove(false)">驳回</el-button>
        <el-button type="primary" @click="onApprove(true)">通过（进入招聘中）</el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer v-model="drawer" :title="detail?.demandNo" size="600px">
      <template v-if="detail">
        <el-tabs>
          <el-tab-pane label="需求概览">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="组织" :span="2">{{ detail.deptPath }}</el-descriptions-item>
              <el-descriptions-item label="职位">{{ detail.positionName }}</el-descriptions-item>
              <el-descriptions-item label="职级">{{ detail.jobLevel }}</el-descriptions-item>
              <el-descriptions-item label="需求人数">{{ detail.headcount }}</el-descriptions-item>
              <el-descriptions-item label="已到岗">{{ detail.arrived }}</el-descriptions-item>
              <el-descriptions-item label="已发Offer">{{ detail.offered }}</el-descriptions-item>
              <el-descriptions-item label="已接受">{{ detail.accepted }}</el-descriptions-item>
              <el-descriptions-item label="招聘季度">{{ detail.recruitQuarter }}</el-descriptions-item>
              <el-descriptions-item label="期望到岗">{{ detail.expectDate || '—' }}</el-descriptions-item>
              <el-descriptions-item label="业务终面人">{{ detail.finalInterviewer || '—' }}</el-descriptions-item>
              <el-descriptions-item label="招聘负责人">{{ detail.recruitOwner || '—' }}</el-descriptions-item>
              <el-descriptions-item label="状态">{{ detail.demandStatus }}</el-descriptions-item>
              <el-descriptions-item label="警示">{{ detail.warningFlag || '—' }}</el-descriptions-item>
            </el-descriptions>
            <div style="margin:16px 0 8px;display:flex;justify-content:space-between;align-items:center">
              <b>授权名单（只读）</b>
              <el-button size="small" type="primary" @click="grantName = ''; grantDialog = true">新增授权</el-button>
            </div>
            <el-table :data="detail.grants" border size="small">
              <el-table-column prop="granteeName" label="被授权人" />
              <el-table-column prop="grantBy" label="授权人" width="110" />
              <el-table-column label="操作" width="90">
                <template #default="{ row }">
                  <el-button link type="danger" @click="onRevoke(row)">撤销</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!detail.grants?.length" description="暂无授权" :image-size="50" />
          </el-tab-pane>
          <el-tab-pane label="操作记录">
            <el-timeline>
              <el-timeline-item v-for="log in detail.logs" :key="log.id" :timestamp="log.createTime" placement="top">
                <b>{{ log.opType }}</b><span v-if="log.content"> · {{ log.content }}</span>
                <div style="color:#999;font-size:12px">{{ log.operator }}</div>
              </el-timeline-item>
            </el-timeline>
            <el-empty v-if="!detail.logs?.length" description="暂无操作记录" :image-size="60" />
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-drawer>

    <el-dialog v-model="grantDialog" title="新增只读授权" width="360px">
      <el-input v-model="grantName" placeholder="被授权人姓名" />
      <template #footer>
        <el-button @click="grantDialog = false">取消</el-button>
        <el-button type="primary" @click="onGrant">授权</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDemandPage, getDemandStats, getDemandDetail, createDemand, submitDemand, approveDemand, closeDemand, grantDemand, revokeGrant } from '../../api/recruit'
import { getEstPage } from '../../api/est'

const tab = ref('normal')
const list = ref([])
const total = ref(0)
const loading = ref(false)
const stats = ref({})
const query = ref({ keyword: '', demandStatus: '', jobCategory: '', quarter: '', pageNum: 1, pageSize: 10 })

const statCards = computed(() => [
  { label: '在招需求', value: stats.value.recruiting ?? '—', color: '#409eff' },
  { label: '需求总人数', value: stats.value.headcountTotal ?? '—', color: '#1d2540' },
  { label: '已到岗', value: stats.value.arrivedTotal ?? '—', color: '#67c23a' },
  { label: '在途Offer', value: stats.value.inTransitTotal ?? '—', color: '#e6a23c' },
  { label: '需升级预警', value: stats.value.alertCount ?? '—', color: '#f56c6c' },
  { label: '待审批', value: stats.value.pendingApproval ?? '—', color: '#909399' }
])

function statusType(s) {
  return { 招聘中: 'primary', 待审批: 'warning', 草稿: 'info', 已完成: 'success', 已关闭: 'info' }[s] || 'info'
}

async function load(reset) {
  if (reset) query.value.pageNum = 1
  loading.value = true
  try {
    const outsource = tab.value === 'outsource'
    const data = await getDemandPage({ ...query.value, keyword: query.value.keyword || undefined, demandStatus: query.value.demandStatus || undefined, jobCategory: query.value.jobCategory || undefined, quarter: query.value.quarter || undefined, outsource })
    list.value = data.list
    total.value = data.total
    stats.value = await getDemandStats({ outsource })
  } finally {
    loading.value = false
  }
}

// 新建
const createDialog = ref(false)
const createForm = ref({})
const estOptions = ref([])

async function openCreate() {
  createForm.value = { headcount: 1, recruitQuarter: '2026Q1', jobCategory: 'S2', empType: '全职-正式' }
  const data = await getEstPage({ estStatus: '生效中', pageSize: 100 })
  estOptions.value = data.list
  createDialog.value = true
}

function onEstChange(estId) {
  const e = estOptions.value.find(x => Number(x.id) === estId)
  if (e) {
    createForm.value.positionName = e.positionName
    createForm.value.deptId = Number(e.deptId)
    createForm.value.deptPath = e.deptPath
    createForm.value.jobLevel = e.jobLevel
    createForm.value.levelCategory = e.levelCategory
    createForm.value.empType = e.empType
  }
}

async function onCreate() {
  if (!createForm.value.positionName) return ElMessage.warning('请填写职位')
  await createDemand(createForm.value)
  ElMessage.success('已创建草稿，提交后进入审批')
  createDialog.value = false
  load(1)
}

async function onSubmit(row) {
  await submitDemand(row.id)
  ElMessage.success('已提交审批')
  load()
}

// 审批
const approveDialog = ref(false)
const approveReason = ref('')
const current = ref(null)

function openApprove(row) {
  current.value = row
  approveReason.value = ''
  approveDialog.value = true
}

async function onApprove(pass) {
  await approveDemand(current.value.id, { pass, reason: approveReason.value })
  ElMessage.success(pass ? '已通过，进入招聘中' : '已驳回')
  approveDialog.value = false
  load()
}

async function onClose(row) {
  const { value } = await ElMessageBox.prompt(`确认关闭需求 ${row.demandNo}？`, '关闭需求', {
    confirmButtonText: '关闭', cancelButtonText: '取消', inputPlaceholder: '关闭原因'
  })
  try {
    await closeDemand(row.id, { reason: value || '' })
    ElMessage.success('已关闭')
    load()
  } catch { /* 业务提示已由拦截器弹出 */ }
}

// 详情
const drawer = ref(false)
const detail = ref(null)
const grantDialog = ref(false)
const grantName = ref('')

async function openDetail(row) {
  detail.value = await getDemandDetail(row.id)
  drawer.value = true
}

async function onGrant() {
  if (!grantName.value) return ElMessage.warning('请输入被授权人')
  await grantDemand(detail.value.id, { granteeName: grantName.value })
  ElMessage.success('已授权')
  grantDialog.value = false
  detail.value = await getDemandDetail(detail.value.id)
}

async function onRevoke(row) {
  await revokeGrant(row.id)
  ElMessage.success('已撤销')
  detail.value = await getDemandDetail(detail.value.id)
}

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.stat-card .label { font-size: 12px; color: #999; }
.stat-card .value { font-size: 24px; font-weight: 600; margin-top: 6px; }
</style>
