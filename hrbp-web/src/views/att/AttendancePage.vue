<template>
  <el-card shadow="never">
    <el-tabs v-model="tab">
      <!-- 日考勤 -->
      <el-tab-pane label="日考勤" name="daily">
        <div class="toolbar">
          <el-date-picker v-model="dailyQuery.attDate" value-format="YYYY-MM-DD" placeholder="日期" style="width:150px" @change="loadDaily(1)" />
          <el-select v-model="dailyQuery.dayStatus" placeholder="状态" clearable style="width:120px" @change="loadDaily(1)">
            <el-option v-for="s in ['正常','迟到','早退','缺卡','旷工','请假','加班','出差']" :key="s" :label="s" :value="s" />
          </el-select>
          <el-button type="primary" @click="openPunch">补录打卡</el-button>
        </div>
        <el-table :data="dailyList" border v-loading="loading">
          <el-table-column prop="empName" label="姓名" width="90" />
          <el-table-column prop="attDate" label="日期" width="110" />
          <el-table-column prop="shiftName" label="班次" width="90" />
          <el-table-column prop="checkIn" label="上班打卡" width="100" />
          <el-table-column prop="checkOut" label="下班打卡" width="100" />
          <el-table-column prop="dayStatus" label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.dayStatus === '正常' ? 'success' : (['迟到','早退','缺卡','旷工'].includes(row.dayStatus) ? 'danger' : 'warning')">{{ row.dayStatus }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="dataSource" label="来源" width="100" />
        </el-table>
        <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                       :total="dailyTotal" v-model:current-page="dailyQuery.pageNum" :page-size="10" @current-change="loadDaily()" />
      </el-tab-pane>

      <!-- 月考勤 -->
      <el-tab-pane label="月考勤" name="monthly">
        <div class="toolbar">
          <el-date-picker v-model="monthQuery.month" type="month" value-format="YYYY-MM" placeholder="月份" style="width:130px" @change="loadMonth(1)" />
          <el-select v-model="monthQuery.status" placeholder="状态" clearable style="width:120px" @change="loadMonth(1)">
            <el-option v-for="s in ['待确认','已确认','已锁定']" :key="s" :label="s" :value="s" />
          </el-select>
        </div>
        <el-table :data="monthList" border>
          <el-table-column prop="empName" label="姓名" width="90" />
          <el-table-column prop="month" label="月份" width="90" />
          <el-table-column prop="shouldDays" label="应出勤" width="80" align="right" />
          <el-table-column prop="actualDays" label="实际出勤" width="90" align="right" />
          <el-table-column prop="lateCount" label="迟到" width="70" align="right" />
          <el-table-column prop="missCount" label="缺卡" width="70" align="right" />
          <el-table-column prop="leaveHours" label="请假(h)" width="90" align="right" />
          <el-table-column prop="overtimeHours" label="加班(h)" width="90" align="right" />
          <el-table-column prop="status" label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="{ 待确认: 'warning', 已确认: 'primary', 已锁定: 'success' }[row.status]">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="130">
            <template #default="{ row }">
              <el-button v-if="row.status === '待确认'" link type="primary" @click="onMonth(row, '已确认')">确认</el-button>
              <el-button v-if="row.status === '已确认'" link type="success" @click="onMonth(row, '已锁定')">锁定</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                       :total="monthTotal" v-model:current-page="monthQuery.pageNum" :page-size="10" @current-change="loadMonth()" />
      </el-tab-pane>

      <!-- 假勤审批 -->
      <el-tab-pane label="假勤审批" name="leave">
        <div class="toolbar">
          <el-radio-group v-model="leaveQuery.approveStatus" @change="loadLeave(1)">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button v-for="s in ['待审批','已通过','已驳回']" :key="s" :value="s">{{ s }}</el-radio-button>
          </el-radio-group>
          <el-button type="primary" @click="openLeave">新建申请</el-button>
        </div>
        <el-table :data="leaveList" border>
          <el-table-column prop="leaveNo" label="单号" width="130" />
          <el-table-column prop="empName" label="姓名" width="80" />
          <el-table-column prop="leaveType" label="类型" width="80" />
          <el-table-column prop="subType" label="子类" width="110" />
          <el-table-column label="时段" min-width="220">
            <template #default="{ row }">{{ fmt(row.startTime) }} ~ {{ fmt(row.endTime) }}</template>
          </el-table-column>
          <el-table-column prop="hours" label="时长(h)" width="80" align="right" />
          <el-table-column prop="approveStatus" label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="{ 待审批: 'warning', 已通过: 'success', 已驳回: 'danger' }[row.approveStatus]">{{ row.approveStatus }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="130">
            <template #default="{ row }">
              <el-button v-if="row.approveStatus === '待审批'" link type="success" @click="onApproveLeave(row, true)">通过</el-button>
              <el-button v-if="row.approveStatus === '待审批'" link type="danger" @click="onApproveLeave(row, false)">驳回</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                       :total="leaveTotal" v-model:current-page="leaveQuery.pageNum" :page-size="10" @current-change="loadLeave()" />
      </el-tab-pane>
    </el-tabs>

    <!-- 补录打卡 -->
    <el-dialog v-model="punchDialog" title="补录打卡" width="440px">
      <el-form label-width="90px">
        <el-form-item label="员工" required>
          <el-select v-model="punchForm.empId" filterable style="width:100%" @change="e => punchForm.empName = employees.find(x => Number(x.id) === e)?.empName">
            <el-option v-for="e in employees" :key="e.id" :label="`${e.empName}（${e.empNo}）`" :value="Number(e.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期" required>
          <el-date-picker v-model="punchForm.attDate" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="上班打卡"><el-time-picker v-model="punchForm.checkIn" value-format="HH:mm" style="width:100%" /></el-form-item>
        <el-form-item label="下班打卡"><el-time-picker v-model="punchForm.checkOut" value-format="HH:mm" style="width:100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="punchDialog = false">取消</el-button>
        <el-button type="primary" @click="onPunch">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新建假勤 -->
    <el-dialog v-model="leaveDialog" title="新建假勤申请" width="480px">
      <el-form :model="leaveForm" label-width="90px">
        <el-form-item label="员工" required>
          <el-select v-model="leaveForm.empId" filterable style="width:100%" @change="e => leaveForm.empName = employees.find(x => Number(x.id) === e)?.empName">
            <el-option v-for="e in employees" :key="e.id" :label="`${e.empName}（${e.empNo}）`" :value="Number(e.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="leaveForm.leaveType">
            <el-option v-for="t in ['请假','加班','出差','补卡']" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="子类">
          <el-select v-model="leaveForm.subType">
            <el-option v-for="t in ['事假','病假','年假','调休','工作日加班','周末加班','出差','补卡']" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="时段" required>
          <el-date-picker v-model="leaveRange" type="datetimerange" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" />
        </el-form-item>
        <el-form-item label="时长(h)"><el-input-number v-model="leaveForm.hours" :min="0.5" :max="240" :step="0.5" /></el-form-item>
        <el-form-item label="事由"><el-input v-model="leaveForm.reason" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="leaveDialog = false">取消</el-button>
        <el-button type="primary" @click="onCreateLeave">提交</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getAttRecordPage, punch, getLeavePage, createLeave, approveLeave, getMonthPage, changeMonthStatus } from '../../api/att'
import { getAllEmployees } from '../../api/employee'

const tab = ref('daily')
const loading = ref(false)
const employees = ref([])

const dailyList = ref([]); const dailyTotal = ref(0)
const dailyQuery = ref({ attDate: '', dayStatus: '', pageNum: 1 })
const monthList = ref([]); const monthTotal = ref(0)
const monthQuery = ref({ month: '', status: '', pageNum: 1 })
const leaveList = ref([]); const leaveTotal = ref(0)
const leaveQuery = ref({ approveStatus: '待审批', pageNum: 1 })

function fmt(t) { return t ? t.replace('T', ' ').slice(0, 16) : '' }

async function loadDaily(reset) {
  if (reset) dailyQuery.value.pageNum = 1
  loading.value = true
  try {
    const d = await getAttRecordPage({ attDate: dailyQuery.value.attDate || undefined, dayStatus: dailyQuery.value.dayStatus || undefined, pageNum: dailyQuery.value.pageNum, pageSize: 10 })
    dailyList.value = d.list; dailyTotal.value = d.total
  } finally { loading.value = false }
}
async function loadMonth(reset) {
  if (reset) monthQuery.value.pageNum = 1
  const d = await getMonthPage({ month: monthQuery.value.month || undefined, status: monthQuery.value.status || undefined, pageNum: monthQuery.value.pageNum, pageSize: 10 })
  monthList.value = d.list; monthTotal.value = d.total
}
async function loadLeave(reset) {
  if (reset) leaveQuery.value.pageNum = 1
  const d = await getLeavePage({ approveStatus: leaveQuery.value.approveStatus || undefined, pageNum: leaveQuery.value.pageNum, pageSize: 10 })
  leaveList.value = d.list; leaveTotal.value = d.total
}

async function onMonth(row, status) {
  await changeMonthStatus(row.id, status)
  ElMessage.success('已' + status)
  loadMonth()
}

// 补录
const punchDialog = ref(false)
const punchForm = ref({})
function openPunch() {
  punchForm.value = { attDate: new Date().toISOString().slice(0, 10) }
  punchDialog.value = true
}
async function onPunch() {
  const r = await punch(punchForm.value)
  ElMessage.success(`已补录，状态判定：${r.dayStatus}`)
  punchDialog.value = false
  loadDaily(1)
}

// 假勤
const leaveDialog = ref(false)
const leaveForm = ref({})
const leaveRange = ref(null)
function openLeave() {
  leaveForm.value = { leaveType: '请假', subType: '事假', hours: 8 }
  leaveRange.value = null
  leaveDialog.value = true
}
async function onCreateLeave() {
  leaveForm.value.startTime = leaveRange.value?.[0]
  leaveForm.value.endTime = leaveRange.value?.[1]
  await createLeave(leaveForm.value)
  ElMessage.success('已提交，待审批')
  leaveDialog.value = false
  loadLeave(1)
}
async function onApproveLeave(row, pass) {
  await approveLeave(row.id, pass)
  ElMessage.success(pass ? '已通过，已回写日考勤与月度汇总' : '已驳回')
  loadLeave(); loadDaily(1); loadMonth()
}

onMounted(async () => {
  loadDaily(); loadMonth(); loadLeave()
  employees.value = await getAllEmployees()
})
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
</style>
