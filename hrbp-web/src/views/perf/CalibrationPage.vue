<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-select v-model="periodId" style="width:160px" @change="load(1)">
        <el-option v-for="p in periods" :key="p.id" :label="`${p.periodName}（${p.stage}）`" :value="Number(p.id)" />
      </el-select>
      <el-alert type="info" :closable="false" style="width:auto"
                title="通晒确认后全部锁定生效，同步员工档案绩效页签与成长记录" />
    </div>
    <el-table :data="list" border v-loading="loading">
      <el-table-column prop="empName" label="姓名" width="90" />
      <el-table-column prop="deptName" label="部门" width="120" />
      <el-table-column prop="selfScore" label="自评" width="80" align="right" />
      <el-table-column prop="managerScore" label="上级" width="80" align="right" />
      <el-table-column prop="suggestGrade" label="建议" width="70">
        <template #default="{ row }"><el-tag size="small" effect="plain">{{ row.suggestGrade }}</el-tag></template>
      </el-table-column>
      <el-table-column label="最终等级" width="110">
        <template #default="{ row }">
          <el-select v-if="['待通晒','已校准'].includes(row.status)" v-model="row.finalGrade" size="small" @change="row._dirty = true">
            <el-option v-for="g in ['S','A','B','C','D']" :key="g" :label="g" :value="g" />
          </el-select>
          <el-tag v-else size="small" type="success">{{ row.finalGrade }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="非B原因" min-width="150">
        <template #default="{ row }">
          <el-input v-if="['待通晒','已校准'].includes(row.status) && row.finalGrade !== 'B'" v-model="row.nonBReason" size="small" placeholder="S/A/C/D 必填" @input="row._dirty = true" />
          <span v-else>{{ row.nonBReason || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="后续计划" min-width="150">
        <template #default="{ row }">
          <el-input v-if="['待通晒','已校准'].includes(row.status)" v-model="row.followPlan" size="small" @input="row._dirty = true" />
          <span v-else>{{ row.followPlan || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === '已生效' ? 'success' : 'warning'">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button v-if="['待通晒','已校准'].includes(row.status)" link type="success" :disabled="!row._dirty || !row.finalGrade" @click="onCalibrate(row)">确认生效</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                   :total="total" v-model:current-page="pageNum" :page-size="10" @current-change="load()" />
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPeriods, getReviews, calibrate } from '../../api/perf'

const periods = ref([])
const periodId = ref(null)
const pageNum = ref(1)
const total = ref(0)
const list = ref([])
const loading = ref(false)

async function load(reset) {
  if (reset) pageNum.value = 1
  loading.value = true
  try {
    const d = await getReviews({ periodId: periodId.value || undefined, pageNum: pageNum.value, pageSize: 10 })
    list.value = d.list.map(r => ({ ...r, finalGrade: r.finalGrade || r.suggestGrade }))
    total.value = d.total
  } finally { loading.value = false }
}

async function onCalibrate(row) {
  await ElMessageBox.confirm(`确认 ${row.empName} 最终等级 ${row.finalGrade}？确认后锁定生效`, '通晒确认', { type: 'warning' })
  await calibrate(row.id, { finalGrade: row.finalGrade, followPlan: row.followPlan, nonBReason: row.nonBReason })
  ElMessage.success('已生效，已同步员工档案与成长记录')
  load()
}

onMounted(async () => {
  periods.value = await getPeriods()
  if (periods.value.length) periodId.value = Number(periods.value[0].id)
  load()
})
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
</style>
