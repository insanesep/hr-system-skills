<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-select v-model="empId" placeholder="选择员工查看时间线" clearable filterable style="width:220px" @change="onEmpChange">
        <el-option v-for="e in employees" :key="e.id" :label="`${e.empName}（${e.empNo}）`" :value="Number(e.id)" />
      </el-select>
      <el-select v-model="eventType" placeholder="事件类型" clearable style="width:140px" @change="load(1)">
        <el-option v-for="t in ['入职','转正','转正延期','转正未通过','调岗','晋升','降职','绩效','离职','合同签订','合同续签','合同解除']" :key="t" :label="t" :value="t" />
      </el-select>
      <el-input v-model="keyword" placeholder="姓名 / 标题" clearable style="width:180px" @change="load(1)" />
    </div>

    <el-row :gutter="16">
      <el-col :span="empId ? 10 : 24">
        <el-table :data="list" border v-loading="loading" highlight-current-row @row-click="row => empId = Number(row.empId) || empId; onEmpChange(row.empId)">
          <el-table-column prop="eventDate" label="日期" width="100" />
          <el-table-column prop="empName" label="姓名" width="80" />
          <el-table-column prop="eventType" label="类型" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="eventColor(row.eventType)">{{ row.eventType }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="事件" min-width="140" show-overflow-tooltip />
          <el-table-column prop="sourceModule" label="来源" width="90" />
          <el-table-column prop="eventStatus" label="状态" width="80">
            <template #default="{ row }">
              <el-tag size="small" :type="row.eventStatus === '有效' ? 'success' : 'info'">{{ row.eventStatus }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next"
                       :total="total" v-model:current-page="pageNum" :page-size="20" @current-change="load()" />
      </el-col>
      <el-col :span="14" v-if="empId">
        <el-card shadow="never">
          <template #header>成长时间线</template>
          <el-timeline v-if="timeline.length">
            <el-timeline-item v-for="e in timeline" :key="e.id" :timestamp="e.eventDate" placement="top"
                              :type="timelineColor(e.eventType)" :hollow="e.eventStatus !== '有效'">
              <b>{{ e.title }}</b>
              <div style="color:#666;font-size:13px;margin-top:4px">{{ e.summary }}</div>
              <div style="color:#bbb;font-size:12px;margin-top:2px">{{ e.sourceModule }} · {{ e.sourceNo }}</div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无成长事件" />
        </el-card>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getGrowthPage, getGrowthTimeline } from '../../api/flow'
import { getAllEmployees } from '../../api/employee'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const empId = ref(null)
const eventType = ref('')
const keyword = ref('')
const pageNum = ref(1)
const employees = ref([])
const timeline = ref([])

function eventColor(t) {
  if (['入职', '转正', '晋升'].includes(t)) return 'success'
  if (['离职', '转正未通过', '降职', '合同解除'].includes(t)) return 'danger'
  if (['调岗', '合同续签'].includes(t)) return 'primary'
  return 'warning'
}
function timelineColor(t) {
  if (['入职', '转正', '晋升'].includes(t)) return 'success'
  if (['离职', '转正未通过', '降职'].includes(t)) return 'danger'
  return 'primary'
}

async function load(reset) {
  if (reset) pageNum.value = 1
  loading.value = true
  try {
    const d = await getGrowthPage({ empId: empId.value || undefined, eventType: eventType.value || undefined, keyword: keyword.value || undefined, pageNum: pageNum.value, pageSize: 20 })
    list.value = d.list; total.value = d.total
  } finally { loading.value = false }
}

async function onEmpChange(id) {
  empId.value = id ? Number(id) : null
  timeline.value = empId.value ? await getGrowthTimeline(empId.value) : []
  load(1)
}

onMounted(async () => {
  load()
  employees.value = await getAllEmployees()
})
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
</style>
