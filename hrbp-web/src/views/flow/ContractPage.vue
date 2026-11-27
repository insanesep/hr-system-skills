<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-radio-group v-model="status" @change="load(1)">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button v-for="s in ['待签订','待生效','生效中','已续签','已到期','已解除']" :key="s" :value="s">{{ s }}</el-radio-button>
      </el-radio-group>
      <el-input v-model="keyword" placeholder="姓名 / 合同编号" clearable style="width:180px" @change="load(1)" />
    </div>
    <el-table :data="list" border v-loading="loading">
      <el-table-column prop="contractNo" label="合同编号" width="170" />
      <el-table-column prop="empName" label="姓名" width="90" />
      <el-table-column prop="contractType" label="类型" width="110" />
      <el-table-column prop="signDate" label="签订日期" width="100">
        <template #default="{ row }">{{ row.signDate || '—' }}</template>
      </el-table-column>
      <el-table-column prop="startDate" label="生效日期" width="100" />
      <el-table-column label="到期日期" width="110">
        <template #default="{ row }">
          <span v-if="!row.endDate">无固定</span>
          <span v-else :style="{ color: daysLeft(row) <= 30 ? '#f56c6c' : 'inherit' }">
            {{ row.endDate }}<template v-if="daysLeft(row) <= 30 && row.status === '生效中'">（剩 {{ daysLeft(row) }} 天）</template>
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="{ 待签订: 'warning', 待生效: 'primary', 生效中: 'success', 已续签: 'primary', 已到期: 'info', 已解除: 'danger' }[row.status]">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button v-if="row.status === '待签订'" link type="primary" @click="onSign(row)">签订</el-button>
          <el-button v-if="row.status === '生效中'" link type="success" @click="openRenew(row)">续签</el-button>
          <el-button v-if="row.status === '生效中'" link type="danger" @click="onRelease(row)">解除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                   :total="total" v-model:current-page="pageNum" :page-size="10" @current-change="load()" />

    <el-dialog v-model="dialog" title="合同续签" width="400px">
      <p style="margin-bottom:12px">{{ current?.contractNo }}</p>
      <el-date-picker v-model="newEndDate" type="date" value-format="YYYY-MM-DD" placeholder="新合同到期日" style="width:100%" />
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="onRenew">续签</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getContractPage, signContract, renewContract, releaseContract } from '../../api/flow'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const status = ref('')
const keyword = ref('')
const pageNum = ref(1)
const dialog = ref(false)
const current = ref(null)
const newEndDate = ref('')

function daysLeft(row) {
  if (!row.endDate) return 9999
  return Math.ceil((new Date(row.endDate) - Date.now()) / 86400000)
}

async function load(reset) {
  if (reset) pageNum.value = 1
  loading.value = true
  try {
    const d = await getContractPage({ status: status.value || undefined, keyword: keyword.value || undefined, pageNum: pageNum.value, pageSize: 10 })
    list.value = d.list; total.value = d.total
  } finally { loading.value = false }
}

async function onSign(row) {
  await signContract(row.id)
  ElMessage.success('已签订')
  load()
}

function openRenew(row) {
  current.value = row
  newEndDate.value = ''
  dialog.value = true
}

async function onRenew() {
  if (!newEndDate.value) return ElMessage.warning('请选择新到期日')
  await renewContract(current.value.id, newEndDate.value)
  ElMessage.success('已续签')
  dialog.value = false
  load()
}

async function onRelease(row) {
  const { value } = await ElMessageBox.prompt('解除原因', '解除合同', { confirmButtonText: '解除', cancelButtonText: '取消' })
  await releaseContract(row.id, value || '')
  ElMessage.success('已解除')
  load()
}

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
</style>
