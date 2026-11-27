<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-radio-group v-model="docStatus" @change="load(1)">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button v-for="s in ['待入职','已入职','未到岗','已取消']" :key="s" :value="s">{{ s }}</el-radio-button>
      </el-radio-group>
      <el-input v-model="keyword" placeholder="姓名" clearable style="width:160px" @change="load(1)" />
      <el-button type="primary" @click="openCreate">新建入职单</el-button>
    </div>
    <el-table :data="list" border v-loading="loading">
      <el-table-column prop="onboardNo" label="入职单号" width="135" />
      <el-table-column prop="empName" label="姓名" width="90" />
      <el-table-column prop="deptName" label="部门" width="110" />
      <el-table-column prop="positionName" label="职位" min-width="150" />
      <el-table-column prop="planDate" label="计划入职" width="100" />
      <el-table-column prop="collectStatus" label="信息采集" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.collectStatus === '已提交' ? 'success' : 'info'">{{ row.collectStatus }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="materialStatus" label="材料" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.materialStatus === '已交齐' ? 'success' : 'warning'">{{ row.materialStatus }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="docStatus" label="状态" width="85">
        <template #default="{ row }">
          <el-tag size="small" :type="{ 待入职: 'primary', 已入职: 'success', 未到岗: 'danger', 已取消: 'info' }[row.docStatus]">{{ row.docStatus }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button v-if="row.docStatus === '待入职'" link type="success" @click="onConfirm(row)">确认入职</el-button>
          <el-button v-if="row.docStatus === '待入职'" link type="danger" @click="onAbsent(row)">标记未到岗</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                   :total="total" v-model:current-page="pageNum" :page-size="10" @current-change="load()" />

    <el-dialog v-model="dialog" title="新建入职单" width="520px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="姓名" required><el-input v-model="form.empName" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="部门" required>
          <el-cascader v-model="deptPath" :options="deptTree" :props="{ label: 'deptName', value: 'id' }" style="width:100%" />
        </el-form-item>
        <el-form-item label="职位" required><el-input v-model="form.positionName" /></el-form-item>
        <el-form-item label="职级"><el-input v-model="form.jobLevel" /></el-form-item>
        <el-form-item label="计划入职" required>
          <el-date-picker v-model="form.planDate" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="信息采集">
          <el-select v-model="form.collectStatus">
            <el-option v-for="s in ['未发送','已发送','已暂存','已提交']" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="材料状态">
          <el-select v-model="form.materialStatus">
            <el-option v-for="s in ['未提交','未交齐','已交齐']" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="onCreate">创建</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOnboardingPage, createOnboarding, confirmOnboarding, absentOnboarding } from '../../api/flow'
import { getDeptTree } from '../../api/org'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const docStatus = ref('')
const keyword = ref('')
const pageNum = ref(1)
const dialog = ref(false)
const form = ref({})
const deptTree = ref([])
const deptPath = ref(null)

async function load(reset) {
  if (reset) pageNum.value = 1
  loading.value = true
  try {
    const d = await getOnboardingPage({ docStatus: docStatus.value || undefined, keyword: keyword.value || undefined, pageNum: pageNum.value, pageSize: 10 })
    list.value = d.list; total.value = d.total
  } finally { loading.value = false }
}

async function openCreate() {
  if (!deptTree.value.length) deptTree.value = await getDeptTree()
  form.value = { collectStatus: '未发送', materialStatus: '未提交' }
  deptPath.value = null
  dialog.value = true
}

function findDept(nodes, id) {
  for (const n of nodes) {
    if (String(n.id) === String(id)) return n
    const r = findDept(n.children || [], id); if (r) return r
  }
  return null
}

async function onCreate() {
  const leaf = deptPath.value?.[deptPath.value.length - 1]
  form.value.deptId = leaf ? Number(leaf) : null
  form.value.deptName = leaf ? findDept(deptTree.value, leaf)?.deptName : null
  await createOnboarding(form.value)
  ElMessage.success('已创建')
  dialog.value = false
  load(1)
}

async function onConfirm(row) {
  await ElMessageBox.confirm(`确认 ${row.empName} 今日到岗入职？将自动创建员工档案、转正单与待签合同`, '确认入职', { type: 'warning' })
  await confirmOnboarding(row.id)
  ElMessage.success('已入职，员工档案已生成')
  load()
}

async function onAbsent(row) {
  const { value } = await ElMessageBox.prompt('爽约原因', '标记未到岗', { confirmButtonText: '确认', cancelButtonText: '取消' })
  await absentOnboarding(row.id, { reason: value || '' })
  ElMessage.success('已标记')
  load()
}

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
</style>
