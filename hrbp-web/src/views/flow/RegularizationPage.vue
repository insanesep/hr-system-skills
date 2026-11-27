<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-radio-group v-model="docStatus" @change="load(1)">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button v-for="s in ['待评估','待审批','已转正','已延期','未通过']" :key="s" :value="s">{{ s }}</el-radio-button>
      </el-radio-group>
      <el-input v-model="keyword" placeholder="姓名" clearable style="width:160px" @change="load(1)" />
    </div>
    <el-table :data="list" border v-loading="loading">
      <el-table-column prop="regNo" label="转正单号" width="135" />
      <el-table-column prop="empName" label="姓名" width="90" />
      <el-table-column prop="deptName" label="部门" width="110" />
      <el-table-column prop="positionName" label="职位" min-width="140" />
      <el-table-column label="试用期" width="200">
        <template #default="{ row }">{{ row.trialStart }} ~ {{ row.trialEnd }}</template>
      </el-table-column>
      <el-table-column label="剩余" width="90">
        <template #default="{ row }">
          <span v-if="row.docStatus === '待评估' || row.docStatus === '待审批'"
                :style="{ color: daysLeft(row) <= 7 ? '#f56c6c' : '#67c23a' }">{{ daysLeft(row) }} 天</span>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column prop="evalScore" label="评估分" width="80" align="right">
        <template #default="{ row }">{{ row.evalScore ?? '—' }}</template>
      </el-table-column>
      <el-table-column prop="docStatus" label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="{ 待评估: 'primary', 待审批: 'warning', 已转正: 'success', 已延期: 'warning', 未通过: 'danger' }[row.docStatus]">{{ row.docStatus }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button v-if="row.docStatus === '待评估'" link type="primary" @click="openEval(row)">评估</el-button>
          <el-button v-if="row.docStatus === '待审批'" link type="success" @click="onApprove(row, true)">审批通过</el-button>
          <el-button v-if="row.docStatus === '待审批'" link type="danger" @click="onApprove(row, false)">不通过</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                   :total="total" v-model:current-page="pageNum" :page-size="10" @current-change="load()" />

    <el-dialog v-model="dialog" title="转正评估" width="440px">
      <el-form label-width="90px">
        <el-form-item label="评估总分">
          <el-rate v-model="evalScore" :max="5" show-score />
        </el-form-item>
        <el-form-item label="评估结论">
          <el-radio-group v-model="evalConclusion">
            <el-radio value="通过">通过</el-radio><el-radio value="延期">延期（+2月，上限6月）</el-radio><el-radio value="不通过">不通过</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="onEval">提交评估</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getRegPage, submitRegEval, approveReg } from '../../api/flow'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const docStatus = ref('')
const keyword = ref('')
const pageNum = ref(1)
const dialog = ref(false)
const current = ref(null)
const evalScore = ref(4)
const evalConclusion = ref('通过')

function daysLeft(row) {
  return Math.max(0, Math.ceil((new Date(row.trialEnd) - Date.now()) / 86400000))
}

async function load(reset) {
  if (reset) pageNum.value = 1
  loading.value = true
  try {
    const d = await getRegPage({ docStatus: docStatus.value || undefined, keyword: keyword.value || undefined, pageNum: pageNum.value, pageSize: 10 })
    list.value = d.list; total.value = d.total
  } finally { loading.value = false }
}

function openEval(row) {
  current.value = row
  evalScore.value = 4
  evalConclusion.value = '通过'
  dialog.value = true
}

async function onEval() {
  await submitRegEval(current.value.id, { score: evalScore.value, conclusion: evalConclusion.value })
  ElMessage.success('评估已提交，待审批')
  dialog.value = false
  load()
}

async function onApprove(row, pass) {
  await approveReg(row.id, pass)
  ElMessage.success(pass ? '已转正' : '已标记未通过')
  load()
}

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
</style>
