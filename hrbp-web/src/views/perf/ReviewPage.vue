<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-select v-model="periodId" style="width:160px" @change="load(1)">
        <el-option v-for="p in periods" :key="p.id" :label="`${p.periodName}（${p.stage}）`" :value="Number(p.id)" />
      </el-select>
      <el-select v-model="status" placeholder="状态" clearable style="width:130px" @change="load(1)">
        <el-option v-for="s in ['未开始','自评中','待上级评价','待通晒','已校准','已生效']" :key="s" :label="s" :value="s" />
      </el-select>
      <el-input v-model="keyword" placeholder="姓名" clearable style="width:150px" @change="load(1)" />
    </div>
    <el-table :data="list" border v-loading="loading">
      <el-table-column prop="empName" label="姓名" width="90" />
      <el-table-column prop="deptName" label="部门" width="120" />
      <el-table-column prop="selfScore" label="自评分" width="90" align="right">
        <template #default="{ row }">{{ row.selfScore ?? '—' }}</template>
      </el-table-column>
      <el-table-column prop="managerScore" label="上级评分" width="95" align="right">
        <template #default="{ row }">{{ row.managerScore ?? '—' }}</template>
      </el-table-column>
      <el-table-column prop="suggestGrade" label="建议等级" width="90">
        <template #default="{ row }">
          <el-tag v-if="row.suggestGrade" size="small">{{ row.suggestGrade }}</el-tag><span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="110">
        <template #default="{ row }">
          <el-tag size="small" :type="{ 待上级评价: 'warning', 待通晒: 'primary', 已生效: 'success' }[row.status] || 'info'">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="openItems(row, 'self')">自评</el-button>
          <el-button link type="success" @click="openItems(row, 'manager')">上级评价</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                   :total="total" v-model:current-page="pageNum" :page-size="10" @current-change="load()" />

    <el-dialog v-model="dialog" :title="mode === 'self' ? '员工自评' : '上级评价'" width="720px">
      <div class="sum-bar">
        实时加权总分：<b :style="{ color: '#f56c6c' }">{{ liveScore }}</b>
        <span v-if="mode === 'manager'" style="margin-left:16px">建议等级：<el-tag size="small">{{ liveGrade }}</el-tag></span>
      </div>
      <el-table :data="items" border>
        <el-table-column prop="targetTitle" label="目标" min-width="160" />
        <el-table-column prop="weight" label="权重%" width="80" align="right" />
        <el-table-column label="评分" width="130">
          <template #default="{ row }">
            <el-input-number v-model="row.score" :min="0" :max="100" :step="1" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="评语" min-width="200">
          <template #default="{ row }">
            <el-input v-model="row.comment" size="small" />
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="onSubmit">提交{{ mode === 'self' ? '自评' : '评价' }}</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getPeriods, getReviews, getReviewItems, submitSelf, submitManager, getGradeConfigs } from '../../api/perf'

const periods = ref([])
const periodId = ref(null)
const status = ref('')
const keyword = ref('')
const pageNum = ref(1)
const total = ref(0)
const list = ref([])
const loading = ref(false)
const dialog = ref(false)
const mode = ref('self')
const current = ref(null)
const items = ref([])
const gradeConfigs = ref([])

const liveScore = computed(() => {
  const sum = items.value.reduce((s, it) => s + (it.score || 0) * (it.weight || 0), 0)
  return (sum / 100).toFixed(1)
})
const liveGrade = computed(() => {
  const s = parseFloat(liveScore.value)
  for (const c of gradeConfigs.value) if (s >= c.scoreFloor) return c.grade
  return 'D'
})

async function load(reset) {
  if (reset) pageNum.value = 1
  loading.value = true
  try {
    const d = await getReviews({ periodId: periodId.value || undefined, status: status.value || undefined, keyword: keyword.value || undefined, pageNum: pageNum.value, pageSize: 10 })
    list.value = d.list; total.value = d.total
  } finally { loading.value = false }
}

async function openItems(row, m) {
  current.value = row
  mode.value = m
  const raw = await getReviewItems(row.id)
  items.value = raw.map(it => ({
    id: Number(it.id), targetTitle: it.targetTitle, weight: it.weight,
    score: m === 'self' ? (it.selfScore ?? null) : (it.managerScore ?? null),
    comment: m === 'self' ? it.selfComment : it.managerComment
  }))
  dialog.value = true
}

async function onSubmit() {
  const payload = items.value.map(it => ({
    id: it.id,
    selfScore: mode.value === 'self' ? it.score : undefined,
    selfComment: mode.value === 'self' ? it.comment : undefined,
    managerScore: mode.value === 'manager' ? it.score : undefined,
    managerComment: mode.value === 'manager' ? it.comment : undefined
  }))
  if (mode.value === 'self') await submitSelf(current.value.id, payload)
  else await submitManager(current.value.id, payload)
  ElMessage.success('已提交')
  dialog.value = false
  load()
}

onMounted(async () => {
  periods.value = await getPeriods()
  if (periods.value.length) periodId.value = Number(periods.value[0].id)
  gradeConfigs.value = await getGradeConfigs()
  load()
})
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.sum-bar { margin-bottom: 12px; font-size: 15px; }
</style>
