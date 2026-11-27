<template>
  <div>
    <!-- 工作台统计 -->
    <el-row :gutter="12" style="margin-bottom:12px">
      <el-col :span="4" v-for="c in statCards" :key="c.label">
        <el-card shadow="hover" class="stat-card">
          <div class="label">{{ c.label }}</div>
          <div class="value" :style="{ color: c.color }">{{ c.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <el-tabs v-model="tab">
        <!-- ========== 职位 ========== -->
        <el-tab-pane label="职位" name="job">
          <div class="toolbar">
            <el-select v-model="jobStatus" placeholder="状态" clearable style="width:120px" @change="loadJobs">
              <el-option v-for="s in ['在招','暂停','已关闭']" :key="s" :label="s" :value="s" />
            </el-select>
            <el-button type="primary" @click="openJobCreate">发布职位</el-button>
          </div>
          <el-table :data="jobs" border>
            <el-table-column prop="jobNo" label="职位编号" width="100" />
            <el-table-column prop="positionName" label="职位名称" min-width="160" />
            <el-table-column prop="jobLevel" label="职级" width="70" />
            <el-table-column prop="headcount" label="在招" width="70" align="right" />
            <el-table-column prop="hired" label="已入职" width="80" align="right" />
            <el-table-column prop="jobStatus" label="状态" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="{ 在招: 'success', 暂停: 'warning', 已关闭: 'info' }[row.jobStatus]">{{ row.jobStatus }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160">
              <template #default="{ row }">
                <el-button v-if="row.jobStatus === '在招'" link type="warning" @click="onJobStatus(row, '暂停')">暂停</el-button>
                <el-button v-if="row.jobStatus === '暂停'" link type="success" @click="onJobStatus(row, '在招')">恢复</el-button>
                <el-button v-if="row.jobStatus !== '已关闭'" link type="danger" @click="onJobStatus(row, '已关闭')">关闭</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- ========== 应聘者 ========== -->
        <el-tab-pane label="应聘者" name="candidate">
          <div class="toolbar">
            <el-input v-model="candKeyword" placeholder="姓名 / 手机号 / 公司" clearable style="width:200px" @change="loadCandidates(1)" />
            <el-button type="primary" @click="openCandCreate">新增应聘者</el-button>
          </div>
          <el-table :data="candidates" border>
            <el-table-column prop="name" label="姓名" width="90" />
            <el-table-column prop="gender" label="性别" width="60" />
            <el-table-column prop="phone" label="手机号" width="125" />
            <el-table-column prop="currentCompany" label="当前公司" min-width="130" />
            <el-table-column prop="currentPosition" label="当前职位" width="120" />
            <el-table-column prop="yearsExp" label="年限" width="60" align="right" />
            <el-table-column prop="education" label="学历" width="70" />
            <el-table-column prop="sourceChannel" label="渠道" width="100" />
            <el-table-column label="锁定" width="130">
              <template #default="{ row }">
                <el-tag v-if="row.lockBy" size="small" type="warning">{{ row.lockBy }}</el-tag>
                <span v-else style="color:#bbb">—</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button v-if="!row.lockBy" link type="primary" @click="onLock(row, true)">锁定</el-button>
                <el-button v-else link type="danger" @click="onLock(row, false)">释放</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                         :total="candTotal" v-model:current-page="candPage" :page-size="10" @current-change="loadCandidates()" />
        </el-tab-pane>

        <!-- ========== 台账（投递） ========== -->
        <el-tab-pane label="投递台账" name="application">
          <div class="toolbar">
            <el-select v-model="appQuery.jobId" placeholder="职位" clearable style="width:200px" @change="loadApplications(1)">
              <el-option v-for="j in jobs" :key="j.id" :label="`${j.jobNo} ${j.positionName}`" :value="Number(j.id)" />
            </el-select>
            <el-select v-model="appQuery.applyStatus" placeholder="投递状态" clearable style="width:130px" @change="loadApplications(1)">
              <el-option v-for="s in ['待筛选','已筛选','初试','复试','终试','Offer','待入职','已入职','已淘汰','已放弃']" :key="s" :label="s" :value="s" />
            </el-select>
            <el-button type="primary" @click="openApplyCreate">新建投递</el-button>
          </div>
          <el-table :data="applications" border>
            <el-table-column prop="candidateName" label="候选人" width="90" />
            <el-table-column prop="positionName" label="职位" min-width="140" />
            <el-table-column prop="applyStatus" label="状态" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="applyType(row.applyStatus)">{{ row.applyStatus }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="firstResult" label="一面" width="70" />
            <el-table-column prop="secondResult" label="二面" width="70" />
            <el-table-column prop="finalResult" label="终面" width="70" />
            <el-table-column prop="entrySource" label="来源" width="100" />
            <el-table-column label="操作" width="240">
              <template #default="{ row }">
                <el-button v-if="row.applyStatus === '待筛选'" link type="primary" @click="onApplyStatus(row, '已筛选')">筛选通过</el-button>
                <el-button v-if="['已筛选','初试','复试','终试'].includes(row.applyStatus)" link type="primary" @click="openInterview(row)">安排面试</el-button>
                <el-button v-if="row.applyStatus === '终试' && row.finalResult === '通过'" link type="success" @click="openOffer(row)">发起Offer</el-button>
                <el-button v-if="!['已淘汰','已放弃','已入职'].includes(row.applyStatus)" link type="danger" @click="onQuit(row)">放弃</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                         :total="appTotal" v-model:current-page="appQuery.pageNum" :page-size="10" @current-change="loadApplications()" />
        </el-tab-pane>

        <!-- ========== 面试 ========== -->
        <el-tab-pane label="面试" name="interview">
          <el-table :data="interviews" border>
            <el-table-column label="候选人" width="90">
              <template #default="{ row }">{{ appName(row.applicationId) }}</template>
            </el-table-column>
            <el-table-column prop="round" label="轮次" width="70" />
            <el-table-column prop="interviewTime" label="面试时间" width="160" />
            <el-table-column prop="location" label="地点" width="120" />
            <el-table-column prop="interviewer" label="面试官" width="90" />
            <el-table-column prop="inviteStatus" label="邀约" width="80" />
            <el-table-column prop="interviewStatus" label="状态" width="85">
              <template #default="{ row }">
                <el-tag size="small" :type="row.interviewStatus === '已完成' ? 'success' : 'primary'">{{ row.interviewStatus }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="conclusion" label="结论" width="70">
              <template #default="{ row }">
                <el-tag v-if="row.conclusion" size="small" :type="{ 通过: 'success', 淘汰: 'danger', 待定: 'warning' }[row.conclusion]">{{ row.conclusion }}</el-tag>
                <span v-else>—</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="110">
              <template #default="{ row }">
                <el-button v-if="row.interviewStatus === '待面试'" link type="primary" @click="openConclusion(row)">评价</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- ========== Offer ========== -->
        <el-tab-pane label="Offer" name="offer">
          <el-table :data="offers" border>
            <el-table-column prop="offerNo" label="Offer编号" width="130" />
            <el-table-column prop="candidateName" label="候选人" width="90" />
            <el-table-column prop="positionName" label="职位" min-width="140" />
            <el-table-column prop="jobLevel" label="职级" width="70" />
            <el-table-column label="年度总包" width="110" align="right">
              <template #default="{ row }">{{ (row.annualPackage / 10000).toFixed(1) }} 万</template>
            </el-table-column>
            <el-table-column prop="validUntil" label="有效期至" width="105" />
            <el-table-column prop="offerStatus" label="状态" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="offerType(row.offerStatus)">{{ row.offerStatus }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button v-if="row.offerStatus === '待审批'" link type="success" @click="onOffer(row, 'approve')">审批通过</el-button>
                <el-button v-if="row.offerStatus === '待发送'" link type="primary" @click="onOffer(row, 'send')">发送</el-button>
                <el-button v-if="row.offerStatus === '已发送'" link type="success" @click="onOffer(row, 'accept')">接受</el-button>
                <el-button v-if="row.offerStatus === '已发送'" link type="danger" @click="onOffer(row, 'reject')">拒绝</el-button>
                <el-button v-if="['待审批','待发送'].includes(row.offerStatus)" link type="info" @click="onOffer(row, 'close')">关闭</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                         :total="offerTotal" v-model:current-page="offerPage" :page-size="10" @current-change="loadOffers()" />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 发布职位 -->
    <el-dialog v-model="jobDialog" title="发布职位" width="480px">
      <el-form :model="jobForm" label-width="90px">
        <el-form-item label="所属需求" required>
          <el-select v-model="jobForm.demandId" style="width:100%" @change="onDemandPick">
            <el-option v-for="d in recruitingDemands" :key="d.id" :label="`${d.demandNo} ${d.positionName}`" :value="Number(d.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="职位名称" required><el-input v-model="jobForm.positionName" /></el-form-item>
        <el-form-item label="职级"><el-input v-model="jobForm.jobLevel" /></el-form-item>
        <el-form-item label="在招人数" required><el-input-number v-model="jobForm.headcount" :min="1" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="jobDialog = false">取消</el-button>
        <el-button type="primary" @click="onCreateJob">发布</el-button>
      </template>
    </el-dialog>

    <!-- 新增应聘者 -->
    <el-dialog v-model="candDialog" title="新增应聘者" width="520px">
      <el-form :model="candForm" label-width="90px">
        <el-form-item label="姓名" required><el-input v-model="candForm.name" /></el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="candForm.gender"><el-radio value="男">男</el-radio><el-radio value="女">女</el-radio></el-radio-group>
        </el-form-item>
        <el-form-item label="手机号" required><el-input v-model="candForm.phone" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="candForm.email" /></el-form-item>
        <el-form-item label="当前公司"><el-input v-model="candForm.currentCompany" /></el-form-item>
        <el-form-item label="当前职位"><el-input v-model="candForm.currentPosition" /></el-form-item>
        <el-form-item label="工作年限"><el-input-number v-model="candForm.yearsExp" :min="0" :max="40" /></el-form-item>
        <el-form-item label="学历">
          <el-select v-model="candForm.education">
            <el-option v-for="e in ['大专','本科','硕士','博士']" :key="e" :label="e" :value="e" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源渠道">
          <el-select v-model="candForm.sourceChannel">
            <el-option v-for="ch in ['BOSS直聘','猎聘','内推','官网','猎头']" :key="ch" :label="ch" :value="ch" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="candDialog = false">取消</el-button>
        <el-button type="primary" @click="onSaveCandidate">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新建投递 -->
    <el-dialog v-model="applyDialog" title="新建投递" width="440px">
      <el-form label-width="90px">
        <el-form-item label="职位" required>
          <el-select v-model="applyForm.jobId" style="width:100%">
            <el-option v-for="j in jobs.filter(x => x.jobStatus === '在招')" :key="j.id" :label="`${j.jobNo} ${j.positionName}`" :value="Number(j.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="应聘者" required>
          <el-select v-model="applyForm.candidateId" style="width:100%" filterable>
            <el-option v-for="c in candidates" :key="c.id" :label="`${c.name}（${c.phone}）`" :value="Number(c.id)" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="applyDialog = false">取消</el-button>
        <el-button type="primary" @click="onCreateApply">投递</el-button>
      </template>
    </el-dialog>

    <!-- 安排面试 -->
    <el-dialog v-model="interviewDialog" title="安排面试" width="440px">
      <el-form :model="interviewForm" label-width="90px">
        <el-form-item label="轮次" required>
          <el-select v-model="interviewForm.round">
            <el-option v-for="r in ['初试','复试','终试']" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间" required>
          <el-date-picker v-model="interviewForm.interviewTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" />
        </el-form-item>
        <el-form-item label="地点"><el-input v-model="interviewForm.location" /></el-form-item>
        <el-form-item label="面试官" required><el-input v-model="interviewForm.interviewer" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="interviewDialog = false">取消</el-button>
        <el-button type="primary" @click="onCreateInterview">安排</el-button>
      </template>
    </el-dialog>

    <!-- 面试评价 -->
    <el-dialog v-model="conclusionDialog" title="面试评价" width="440px">
      <el-form label-width="90px">
        <el-form-item label="结论" required>
          <el-radio-group v-model="conclusionForm.conclusion">
            <el-radio value="通过">通过</el-radio><el-radio value="淘汰">淘汰</el-radio><el-radio value="待定">待定</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="评价">
          <el-input v-model="conclusionForm.comment" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="conclusionDialog = false">取消</el-button>
        <el-button type="primary" @click="onConclusion">提交</el-button>
      </template>
    </el-dialog>

    <!-- 发起 Offer -->
    <el-dialog v-model="offerDialog" title="发起 Offer" width="520px">
      <el-form :model="offerForm" label-width="110px">
        <el-form-item label="月度固定"><el-input-number v-model="offerForm.monthlyBase" :min="0" :step="1000" /></el-form-item>
        <el-form-item label="月度绩效基数"><el-input-number v-model="offerForm.monthlyPerf" :min="0" :step="500" /></el-form-item>
        <el-form-item label="奖金月数"><el-input-number v-model="offerForm.annualBonusMonths" :min="0" :max="12" :step="0.5" /></el-form-item>
        <el-form-item label="签字费"><el-input-number v-model="offerForm.signBonus" :min="0" :step="1000" /></el-form-item>
        <el-form-item label="年度总包">
          <b style="color:#f56c6c">{{ computedPackage.toLocaleString() }} 元</b>
        </el-form-item>
        <el-form-item label="拟入职日期">
          <el-date-picker v-model="offerForm.onboardDate" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="offerDialog = false">取消</el-button>
        <el-button type="primary" @click="onCreateOffer">发起</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProcessStats, getJobs, createJob, changeJobStatus, getCandidates, saveCandidate, lockCandidate,
         getApplications, createApplication, changeApplyStatus, getInterviews, createInterview, submitConclusion,
         getOffers, createOffer, offerAction, getDemandPage } from '../../api/recruit'

const tab = ref('job')
const stats = ref({})
const statCards = computed(() => [
  { label: '在招职位', value: stats.value.openJobs ?? '—', color: '#409eff' },
  { label: '应聘者', value: stats.value.candidates ?? '—', color: '#1d2540' },
  { label: '待筛选', value: stats.value.pendingScreen ?? '—', color: '#e6a23c' },
  { label: '面试中', value: stats.value.interviewing ?? '—', color: '#409eff' },
  { label: 'Offer中', value: stats.value.offered ?? '—', color: '#e6a23c' },
  { label: '待入职', value: stats.value.pendingOnboard ?? '—', color: '#67c23a' }
])

// 职位
const jobs = ref([])
const jobStatus = ref('')
const jobDialog = ref(false)
const jobForm = ref({})
const recruitingDemands = ref([])

async function loadJobs() {
  jobs.value = await getJobs({ jobStatus: jobStatus.value || undefined })
}
async function openJobCreate() {
  const d = await getDemandPage({ demandStatus: '招聘中', pageSize: 100 })
  recruitingDemands.value = d.list
  jobForm.value = { headcount: 1 }
  jobDialog.value = true
}
function onDemandPick(id) {
  const d = recruitingDemands.value.find(x => Number(x.id) === id)
  if (d) { jobForm.value.positionName = d.positionName; jobForm.value.jobLevel = d.jobLevel }
}
async function onCreateJob() {
  await createJob(jobForm.value)
  ElMessage.success('已发布')
  jobDialog.value = false
  loadJobs(); loadStats()
}
async function onJobStatus(row, status) {
  await changeJobStatus(row.id, status)
  ElMessage.success('已' + status)
  loadJobs(); loadStats()
}

// 应聘者
const candidates = ref([])
const candTotal = ref(0)
const candPage = ref(1)
const candKeyword = ref('')
const candDialog = ref(false)
const candForm = ref({})

async function loadCandidates(reset) {
  if (reset) candPage.value = 1
  const d = await getCandidates({ keyword: candKeyword.value || undefined, pageNum: candPage.value, pageSize: 10 })
  candidates.value = d.list
  candTotal.value = d.total
}
function openCandCreate() {
  candForm.value = { gender: '男', yearsExp: 3, education: '本科', sourceChannel: 'BOSS直聘' }
  candDialog.value = true
}
async function onSaveCandidate() {
  await saveCandidate(candForm.value)
  ElMessage.success('已保存')
  candDialog.value = false
  loadCandidates()
}
async function onLock(row, lock) {
  await lockCandidate(row.id, lock)
  ElMessage.success(lock ? '已锁定 7 天' : '已释放')
  loadCandidates()
}

// 投递
const applications = ref([])
const appTotal = ref(0)
const appQuery = ref({ jobId: null, applyStatus: '', pageNum: 1 })
const applyDialog = ref(false)
const applyForm = ref({})

async function loadApplications(reset) {
  if (reset) appQuery.value.pageNum = 1
  const d = await getApplications({ jobId: appQuery.value.jobId || undefined, applyStatus: appQuery.value.applyStatus || undefined, pageNum: appQuery.value.pageNum, pageSize: 10 })
  applications.value = d.list
  appTotal.value = d.total
}
function applyType(s) {
  if (s === '已淘汰' || s === '已放弃') return 'danger'
  if (s === '已入职') return 'success'
  if (s === '待入职' || s === 'Offer') return 'warning'
  return 'primary'
}
function openApplyCreate() {
  applyForm.value = {}
  applyDialog.value = true
}
async function onCreateApply() {
  await createApplication(applyForm.value)
  ElMessage.success('已投递')
  applyDialog.value = false
  loadApplications(); loadStats()
}
async function onApplyStatus(row, status) {
  await changeApplyStatus(row.id, { status })
  ElMessage.success('已更新')
  loadApplications(); loadStats()
}
async function onQuit(row) {
  const { value } = await ElMessageBox.prompt('放弃原因', '放弃投递', { confirmButtonText: '确认', cancelButtonText: '取消' })
  await changeApplyStatus(row.id, { status: '已放弃', quitReason: value || '' })
  ElMessage.success('已放弃')
  loadApplications()
}

// 面试
const interviews = ref([])
const interviewDialog = ref(false)
const interviewForm = ref({})
const conclusionDialog = ref(false)
const conclusionForm = ref({})
const currentInterview = ref(null)

async function loadInterviews() {
  interviews.value = await getInterviews()
}
function appName(appId) {
  const a = applications.value.find(x => Number(x.id) === Number(appId))
  return a ? a.candidateName : `#${appId}`
}
function openInterview(row) {
  interviewForm.value = { applicationId: Number(row.id), round: nextRound(row.applyStatus), location: '', interviewer: '' }
  interviewDialog.value = true
}
function nextRound(status) {
  return { 已筛选: '初试', 初试: '复试', 复试: '终试', 终试: '终试' }[status] || '初试'
}
async function onCreateInterview() {
  await createInterview(interviewForm.value)
  ElMessage.success('已安排')
  interviewDialog.value = false
  loadInterviews(); loadApplications()
}
function openConclusion(row) {
  currentInterview.value = row
  conclusionForm.value = { conclusion: '通过', comment: '' }
  conclusionDialog.value = true
}
async function onConclusion() {
  await submitConclusion(currentInterview.value.id, conclusionForm.value)
  ElMessage.success('已提交评价')
  conclusionDialog.value = false
  loadInterviews(); loadApplications(); loadStats()
}

// Offer
const offers = ref([])
const offerTotal = ref(0)
const offerPage = ref(1)
const offerDialog = ref(false)
const offerForm = ref({})
const currentApp = ref(null)

async function loadOffers() {
  const d = await getOffers({ pageNum: offerPage.value, pageSize: 10 })
  offers.value = d.list
  offerTotal.value = d.total
}
function offerType(s) {
  return { 待审批: 'warning', 待发送: 'primary', 已发送: 'primary', 已接受: 'success', 已拒绝: 'danger', 已入职: 'success', 已关闭: 'info', 已失效: 'info' }[s] || 'info'
}
const computedPackage = computed(() => {
  const f = offerForm.value
  return ((f.monthlyBase || 0) + (f.monthlyPerf || 0)) * 12 + (f.monthlyBase || 0) * (f.annualBonusMonths || 0) + (f.signBonus || 0)
})
function openOffer(row) {
  currentApp.value = row
  offerForm.value = { applicationId: Number(row.id), candidateName: row.candidateName, positionName: row.positionName, monthlyBase: 20000, monthlyPerf: 3000, annualBonusMonths: 3, signBonus: 0 }
  offerDialog.value = true
}
async function onCreateOffer() {
  await createOffer(offerForm.value)
  ElMessage.success('Offer 已发起，待审批')
  offerDialog.value = false
  loadOffers(); loadApplications(); loadStats()
}
async function onOffer(row, action) {
  await offerAction(row.id, action)
  ElMessage.success('操作成功')
  loadOffers(); loadApplications(); loadStats()
}

async function loadStats() {
  stats.value = await getProcessStats()
}

onMounted(() => {
  loadStats(); loadJobs(); loadCandidates(); loadApplications(); loadInterviews(); loadOffers()
})
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.stat-card .label { font-size: 12px; color: #999; }
.stat-card .value { font-size: 24px; font-weight: 600; margin-top: 6px; }
</style>
