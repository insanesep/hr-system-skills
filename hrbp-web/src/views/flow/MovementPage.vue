<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-radio-group v-model="docStatus" @change="load(1)">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button v-for="s in ['草稿','待审批','待生效','已生效','已驳回']" :key="s" :value="s">{{ s }}</el-radio-button>
      </el-radio-group>
      <el-button type="primary" @click="openCreate">发起异动</el-button>
    </div>
    <el-table :data="list" border v-loading="loading">
      <el-table-column prop="mvNo" label="异动单号" width="135" />
      <el-table-column prop="empName" label="姓名" width="80" />
      <el-table-column prop="mvType" label="类型" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="{ 晋升: 'success', 降职: 'danger', 调岗: 'primary' }[row.mvType]">{{ row.mvType }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="原职位/职级" min-width="150">
        <template #default="{ row }">{{ row.fromPosition }} / {{ row.fromLevel }}</template>
      </el-table-column>
      <el-table-column label="目标职位/职级" min-width="150">
        <template #default="{ row }">{{ row.toPosition }} / {{ row.toLevel }}</template>
      </el-table-column>
      <el-table-column prop="toDept" label="目标部门" width="120" />
      <el-table-column prop="effectiveDate" label="生效日期" width="100" />
      <el-table-column prop="docStatus" label="状态" width="85">
        <template #default="{ row }">
          <el-tag size="small" :type="{ 草稿: 'info', 待审批: 'warning', 待生效: 'primary', 已生效: 'success', 已驳回: 'danger' }[row.docStatus]">{{ row.docStatus }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="130">
        <template #default="{ row }">
          <el-button v-if="row.docStatus === '草稿'" link type="primary" @click="onSubmit(row)">提交</el-button>
          <el-button v-if="row.docStatus === '待审批'" link type="success" @click="onApprove(row, true)">通过</el-button>
          <el-button v-if="row.docStatus === '待审批'" link type="danger" @click="onApprove(row, false)">驳回</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                   :total="total" v-model:current-page="pageNum" :page-size="10" @current-change="load()" />

    <el-dialog v-model="dialog" title="发起异动（类型按职级自动判定）" width="520px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="员工" required>
          <el-select v-model="form.empId" filterable style="width:100%" @change="onEmpPick">
            <el-option v-for="e in employees" :key="e.id" :label="`${e.empName}（${e.empNo} ${e.positionName}/${e.jobLevel}）`" :value="Number(e.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标部门" required>
          <el-cascader v-model="toDeptPath" :options="deptTree" :props="{ label: 'deptName', value: 'id' }" style="width:100%" />
        </el-form-item>
        <el-form-item label="目标职位" required><el-input v-model="form.toPosition" /></el-form-item>
        <el-form-item label="目标职级">
          <el-select v-model="form.toLevel" clearable>
            <el-option v-for="l in levelCodes" :key="l" :label="l" :value="l" />
          </el-select>
        </el-form-item>
        <el-form-item label="生效日期" required>
          <el-date-picker v-model="form.effectiveDate" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="异动原因"><el-input v-model="form.reason" type="textarea" :rows="2" /></el-form-item>
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
import { ElMessage } from 'element-plus'
import { getMovementPage, createMovement, submitMovement, approveMovement } from '../../api/flow'
import { getAllEmployees } from '../../api/employee'
import { getDeptTree, getLevelMatrix } from '../../api/org'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const docStatus = ref('')
const pageNum = ref(1)
const dialog = ref(false)
const form = ref({})
const employees = ref([])
const deptTree = ref([])
const toDeptPath = ref(null)
const levelCodes = ref([])

async function load(reset) {
  if (reset) pageNum.value = 1
  loading.value = true
  try {
    const d = await getMovementPage({ docStatus: docStatus.value || undefined, pageNum: pageNum.value, pageSize: 10 })
    list.value = d.list; total.value = d.total
  } finally { loading.value = false }
}

function findDept(nodes, id) {
  for (const n of nodes) {
    if (String(n.id) === String(id)) return n
    const r = findDept(n.children || [], id); if (r) return r
  }
  return null
}

async function openCreate() {
  employees.value = await getAllEmployees()
  if (!deptTree.value.length) deptTree.value = await getDeptTree()
  const m = await getLevelMatrix()
  levelCodes.value = Object.values(m).flat().map(l => l.levelCode)
  form.value = {}
  toDeptPath.value = null
  dialog.value = true
}

function onEmpPick(id) {
  const e = employees.value.find(x => Number(x.id) === id)
  if (e) form.value.toLevel = e.jobLevel
}

async function onCreate() {
  const leaf = toDeptPath.value?.[toDeptPath.value.length - 1]
  form.value.toDeptId = leaf ? Number(leaf) : null
  form.value.toDept = leaf ? findDept(deptTree.value, leaf)?.deptName : null
  await createMovement(form.value)
  ElMessage.success('已创建，提交后进入审批')
  dialog.value = false
  load(1)
}

async function onSubmit(row) {
  await submitMovement(row.id)
  ElMessage.success('已提交')
  load()
}

async function onApprove(row, pass) {
  await approveMovement(row.id, pass)
  ElMessage.success(pass ? '已通过，生效日自动回写' : '已驳回')
  load()
}

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
</style>
