<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-select v-model="empId" placeholder="员工" clearable filterable style="width:180px" @change="load(1)">
        <el-option v-for="e in employees" :key="e.id" :label="e.empName" :value="Number(e.id)" />
      </el-select>
      <el-select v-model="recordType" placeholder="记录类型" clearable style="width:140px" @change="load(1)">
        <el-option v-for="t in ['关键信息','访谈沟通','述职','会议观察','人才盘点']" :key="t" :label="t" :value="t" />
      </el-select>
      <el-button type="primary" @click="openCreate">新增记录</el-button>
    </div>
    <el-table :data="list" border v-loading="loading">
      <el-table-column prop="recordNo" label="记录编号" width="135" />
      <el-table-column prop="empName" label="姓名" width="80" />
      <el-table-column prop="recordType" label="类型" width="100">
        <template #default="{ row }"><el-tag size="small" effect="plain">{{ row.recordType }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="version" label="版本" width="60">
        <template #default="{ row }">v{{ row.version }}</template>
      </el-table-column>
      <el-table-column prop="content" label="内容" min-width="260" show-overflow-tooltip />
      <el-table-column prop="recordDate" label="记录日期" width="100" />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === '有效' ? 'success' : 'info'">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button v-if="row.status === '有效'" link type="primary" @click="openEdit(row)">更正</el-button>
          <el-button v-if="row.status === '有效'" link type="danger" @click="onRevoke(row)">撤销</el-button>
          <el-button link @click="openHistory(row)">历史</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                   :total="total" v-model:current-page="pageNum" :page-size="10" @current-change="load()" />

    <el-dialog v-model="dialog" :title="editRow ? '更正记录（生成新版本）' : '新增记录'" width="560px">
      <el-form label-width="90px">
        <el-form-item v-if="!editRow" label="员工" required>
          <el-select v-model="form.empId" filterable style="width:100%" @change="e => form.empName = employees.find(x => Number(x.id) === e)?.empName">
            <el-option v-for="e in employees" :key="e.id" :label="`${e.empName}（${e.empNo}）`" :value="Number(e.id)" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!editRow" label="类型" required>
          <el-select v-model="form.recordType">
            <el-option v-for="t in ['关键信息','访谈沟通','述职','会议观察','人才盘点']" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="form.content" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item v-if="editRow" label="更正原因" required>
          <el-input v-model="form.editReason" placeholder="必填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="historyDrawer" :title="historyRow?.recordNo + ' 版本历史'" size="480px">
      <el-timeline>
        <el-timeline-item v-for="h in history" :key="h.id" :timestamp="h.createTime" placement="top"
                          :type="h.status === '有效' ? 'success' : 'info'">
          <b>v{{ h.version }}（{{ h.status }}）</b>
          <div style="margin-top:4px;color:#666">{{ h.content }}</div>
          <div v-if="h.editReason" style="font-size:12px;color:#999;margin-top:4px">更正原因：{{ h.editReason }}</div>
          <div v-if="h.revokeReason" style="font-size:12px;color:#f56c6c;margin-top:4px">撤销：{{ h.revokeReason }}</div>
        </el-timeline-item>
      </el-timeline>
    </el-drawer>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../../api/request'
import { getAllEmployees } from '../../api/employee'

const getRecordPage = params => request.get('/talent/record/page', { params })
const createRecord = data => request.post('/talent/record', data)
const editRecord = (id, data) => request.post(`/talent/record/${id}/edit`, data)
const revokeRecord = (id, reason) => request.post(`/talent/record/${id}/revoke`, { reason })
const getHistory = recordNo => request.get(`/talent/record/history/${recordNo}`)

const list = ref([])
const total = ref(0)
const loading = ref(false)
const empId = ref(null)
const recordType = ref('')
const pageNum = ref(1)
const employees = ref([])
const dialog = ref(false)
const editRow = ref(null)
const form = ref({})
const historyDrawer = ref(false)
const historyRow = ref(null)
const history = ref([])

async function load(reset) {
  if (reset) pageNum.value = 1
  loading.value = true
  try {
    const d = await getRecordPage({ empId: empId.value || undefined, recordType: recordType.value || undefined, pageNum: pageNum.value, pageSize: 10 })
    list.value = d.list; total.value = d.total
  } finally { loading.value = false }
}

function openCreate() {
  editRow.value = null
  form.value = { recordType: '访谈沟通' }
  dialog.value = true
}

function openEdit(row) {
  editRow.value = row
  form.value = { content: row.content, editReason: '' }
  dialog.value = true
}

async function onSave() {
  if (editRow.value) {
    if (!form.value.editReason) return ElMessage.warning('更正原因必填')
    await editRecord(editRow.value.id, form.value)
    ElMessage.success('已生成新版本')
  } else {
    await createRecord(form.value)
    ElMessage.success('已创建')
  }
  dialog.value = false
  load()
}

async function onRevoke(row) {
  const { value } = await ElMessageBox.prompt('撤销原因（历史保留不删除）', '撤销记录', { confirmButtonText: '撤销', cancelButtonText: '取消', inputValidator: v => !!v || '原因必填' })
  await revokeRecord(row.id, value)
  ElMessage.success('已撤销')
  load()
}

async function openHistory(row) {
  historyRow.value = row
  history.value = await getHistory(row.recordNo)
  historyDrawer.value = true
}

onMounted(async () => {
  load()
  employees.value = await getAllEmployees()
})
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
</style>
