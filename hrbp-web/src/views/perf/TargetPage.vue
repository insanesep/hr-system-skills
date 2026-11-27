<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-select v-model="periodId" style="width:160px" @change="load">
        <el-option v-for="p in periods" :key="p.id" :label="`${p.periodName}（${p.stage}）`" :value="Number(p.id)" />
      </el-select>
      <el-select v-model="empId" placeholder="员工" filterable style="width:200px" @change="load">
        <el-option v-for="e in employees" :key="e.id" :label="e.empName" :value="Number(e.id)" />
      </el-select>
      <el-button type="primary" @click="openEdit">编辑目标</el-button>
      <el-button type="success" @click="onSubmit" :disabled="!targets.length">提交</el-button>
      <el-button type="warning" @click="onConfirm(true)" :disabled="!targets.length">确认生效</el-button>
      <span :style="{ marginLeft: 'auto', fontWeight: 600, color: weightTotal === 100 ? '#67c23a' : '#f56c6c' }">
        权重合计 {{ weightTotal }}%
      </span>
    </div>
    <el-table :data="targets" border v-loading="loading">
      <el-table-column prop="title" label="目标标题" min-width="180" />
      <el-table-column prop="metricDesc" label="指标描述" min-width="200" show-overflow-tooltip />
      <el-table-column prop="standard" label="衡量标准" min-width="160" show-overflow-tooltip />
      <el-table-column prop="weight" label="权重%" width="90" align="right" />
      <el-table-column prop="progress" label="进度%" width="90" align="right" />
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="{ 草稿: 'info', 待确认: 'warning', 已生效: 'success', 已归档: 'info' }[row.status]">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!targets.length && !loading" description="暂无目标，点击「编辑目标」添加" />

    <el-dialog v-model="dialog" title="编辑绩效目标（权重合计须 100%）" width="720px">
      <div v-for="(t, i) in editList" :key="i" class="target-row">
        <el-input v-model="t.title" placeholder="目标标题" style="width:180px" />
        <el-input v-model="t.metricDesc" placeholder="指标描述" style="width:200px" />
        <el-input v-model="t.standard" placeholder="衡量标准" style="width:160px" />
        <el-input-number v-model="t.weight" :min="0" :max="100" placeholder="权重" style="width:100px" />
        <el-button link type="danger" @click="editList.splice(i, 1)">删除</el-button>
      </div>
      <el-button size="small" @click="editList.push({ title: '', metricDesc: '', standard: '', weight: 0 })">+ 添加目标</el-button>
      <div style="margin-top:10px;font-weight:600" :style="{ color: editWeightTotal === 100 ? '#67c23a' : '#f56c6c' }">
        当前合计 {{ editWeightTotal }}%
      </div>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :disabled="editWeightTotal !== 100" @click="onSave">保存草稿</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getPeriods, getTargets, saveTargets, submitTargets, confirmTargets } from '../../api/perf'
import { getAllEmployees } from '../../api/employee'

const periods = ref([])
const periodId = ref(null)
const employees = ref([])
const empId = ref(null)
const targets = ref([])
const loading = ref(false)
const dialog = ref(false)
const editList = ref([])

const weightTotal = computed(() => targets.value.reduce((s, t) => s + (t.weight || 0), 0))
const editWeightTotal = computed(() => editList.value.reduce((s, t) => s + (t.weight || 0), 0))

async function load() {
  if (!periodId.value) return
  loading.value = true
  try {
    targets.value = await getTargets({ periodId: periodId.value, empId: empId.value || undefined })
  } finally { loading.value = false }
}

function openEdit() {
  if (!empId.value) return ElMessage.warning('请先选择员工')
  editList.value = targets.value.length
    ? targets.value.map(t => ({ title: t.title, metricDesc: t.metricDesc, standard: t.standard, weight: t.weight }))
    : [{ title: '', metricDesc: '', standard: '', weight: 0 }]
  dialog.value = true
}

async function onSave() {
  const emp = employees.value.find(x => Number(x.id) === empId.value)
  await saveTargets({ periodId: periodId.value, empId: empId.value, empName: emp?.empName, targets: editList.value })
  ElMessage.success('已保存草稿')
  dialog.value = false
  load()
}

async function onSubmit() {
  await submitTargets(periodId.value, empId.value)
  ElMessage.success('已提交，待确认')
  load()
}

async function onConfirm(confirm) {
  await confirmTargets({ periodId: periodId.value, empId: empId.value, confirm, reason: '' })
  ElMessage.success('目标已生效，考核表已生成')
  load()
}

onMounted(async () => {
  periods.value = await getPeriods()
  if (periods.value.length) periodId.value = Number(periods.value[0].id)
  employees.value = await getAllEmployees()
  load()
})
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
.target-row { display: flex; gap: 8px; margin-bottom: 8px; }
</style>
