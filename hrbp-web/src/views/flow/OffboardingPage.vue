<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-radio-group v-model="docStatus" @change="load(1)">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button v-for="s in ['草稿','待审批','待离职','待确认','已离职','已撤销']" :key="s" :value="s">{{ s }}</el-radio-button>
      </el-radio-group>
      <el-button type="primary" @click="openCreate">发起离职</el-button>
    </div>
    <el-table :data="list" border v-loading="loading">
      <el-table-column prop="offNo" label="离职单号" width="135" />
      <el-table-column prop="empName" label="姓名" width="90" />
      <el-table-column prop="positionName" label="职位" min-width="140" />
      <el-table-column prop="offType" label="离职类型" width="110" />
      <el-table-column prop="lastWorkDate" label="最后工作日" width="105" />
      <el-table-column prop="handoverStatus" label="交接" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.handoverStatus === '已完成' ? 'success' : 'warning'">{{ row.handoverStatus }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="docStatus" label="状态" width="85">
        <template #default="{ row }">
          <el-tag size="small" :type="{ 草稿: 'info', 待审批: 'warning', 待离职: 'primary', 待确认: 'primary', 已离职: 'success', 已撤销: 'info' }[row.docStatus]">{{ row.docStatus }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button v-if="row.docStatus === '草稿'" link type="primary" @click="onSubmit(row)">提交</el-button>
          <el-button v-if="row.docStatus === '待审批'" link type="success" @click="onApprove(row, true)">通过</el-button>
          <el-button v-if="row.docStatus === '待审批'" link type="danger" @click="onApprove(row, false)">撤销</el-button>
          <el-button v-if="['待离职','待确认'].includes(row.docStatus) && row.handoverStatus !== '已完成'" link type="primary" @click="onHandover(row)">交接完成</el-button>
          <el-button v-if="['待离职','待确认'].includes(row.docStatus)" link type="success" @click="onConfirm(row)">确认离职</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                   :total="total" v-model:current-page="pageNum" :page-size="10" @current-change="load()" />

    <el-dialog v-model="dialog" title="发起离职" width="480px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="员工" required>
          <el-select v-model="form.empId" filterable style="width:100%">
            <el-option v-for="e in employees" :key="e.id" :label="`${e.empName}（${e.empNo}）`" :value="Number(e.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="离职类型" required>
          <el-select v-model="form.offType">
            <el-option v-for="t in ['主动离职','协商一致','公司单方','合同到期不续签','试用期不通过','退休','其他']" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="最后工作日" required>
          <el-date-picker v-model="form.lastWorkDate" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="离职原因"><el-input v-model="form.offReason" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="onCreate">创建（草稿）</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOffboardingPage, createOffboarding, submitOffboarding, approveOffboarding, updateHandover, confirmOffboarding } from '../../api/flow'
import { getAllEmployees } from '../../api/employee'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const docStatus = ref('')
const pageNum = ref(1)
const dialog = ref(false)
const form = ref({})
const employees = ref([])

async function load(reset) {
  if (reset) pageNum.value = 1
  loading.value = true
  try {
    const d = await getOffboardingPage({ docStatus: docStatus.value || undefined, pageNum: pageNum.value, pageSize: 10 })
    list.value = d.list; total.value = d.total
  } finally { loading.value = false }
}

async function openCreate() {
  employees.value = await getAllEmployees()
  form.value = { offType: '主动离职' }
  dialog.value = true
}

async function onCreate() {
  await createOffboarding(form.value)
  ElMessage.success('已创建')
  dialog.value = false
  load(1)
}

async function onSubmit(row) { await submitOffboarding(row.id); ElMessage.success('已提交'); load() }
async function onApprove(row, pass) { await approveOffboarding(row.id, pass); ElMessage.success(pass ? '已通过' : '已撤销'); load() }
async function onHandover(row) { await updateHandover(row.id, '已完成'); ElMessage.success('交接已完成'); load() }

async function onConfirm(row) {
  await ElMessageBox.confirm(`确认 ${row.empName} 离职？将回写员工状态、结束任职并解除合同`, '确认离职', { type: 'warning' })
  await confirmOffboarding(row.id)
  ElMessage.success('已离职')
  load()
}

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
</style>
