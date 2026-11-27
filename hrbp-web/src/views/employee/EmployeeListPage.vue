<template>
  <div>
    <el-card shadow="never">
      <div class="toolbar">
        <el-input v-model="query.keyword" placeholder="姓名 / 工号 / 手机号" clearable style="width:200px" :prefix-icon="Search" @change="load(1)" />
        <el-cascader v-model="deptPath" :options="deptTree" :props="{ label: 'deptName', value: 'id', checkStrictly: true }"
                     placeholder="所属部门" clearable style="width:200px" @change="load(1)" />
        <el-select v-model="query.empStatus" placeholder="在职状态" clearable style="width:120px" @change="load(1)">
          <el-option label="在职" value="在职" /><el-option label="离职" value="离职" />
        </el-select>
        <el-date-picker v-model="hireRange" type="daterange" value-format="YYYY-MM-DD"
                        start-placeholder="入职起" end-placeholder="入职止" style="width:240px" @change="load(1)" />
      </div>

      <el-table :data="list" border v-loading="loading" @row-click="openDetail" style="cursor:pointer">
        <el-table-column prop="empNo" label="工号" width="90" />
        <el-table-column prop="empName" label="姓名" width="100" />
        <el-table-column prop="gender" label="性别" width="60" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="positionName" label="职位" width="170" />
        <el-table-column prop="jobLevel" label="职级" width="70" />
        <el-table-column prop="workLocation" label="工作地点" width="90" />
        <el-table-column prop="hireDate" label="入职日期" width="110" />
        <el-table-column prop="regularDate" label="转正日期" width="110">
          <template #default="{ row }">{{ row.regularDate || '—' }}</template>
        </el-table-column>
        <el-table-column prop="empStatus" label="状态" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.empStatus === '在职' ? 'success' : 'info'">{{ row.empStatus }}</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination style="margin-top:12px;justify-content:flex-end" layout="total, prev, pager, next, sizes"
                     :total="total" v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
                     :page-sizes="[10, 20, 50]" @current-change="load()" @size-change="load(1)" />
    </el-card>

    <el-drawer v-model="drawer" :title="detail?.info ? `${detail.info.empName}（${detail.info.empNo}）` : ''" size="640px">
      <template v-if="detail">
        <el-tabs>
          <el-tab-pane label="基本信息">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="工号">{{ detail.info.empNo }}</el-descriptions-item>
              <el-descriptions-item label="姓名">{{ detail.info.empName }}</el-descriptions-item>
              <el-descriptions-item label="性别">{{ detail.info.gender }}</el-descriptions-item>
              <el-descriptions-item label="出生日期">{{ detail.info.birthDate || '—' }}</el-descriptions-item>
              <el-descriptions-item label="手机号">{{ detail.info.phone || '—' }}</el-descriptions-item>
              <el-descriptions-item label="邮箱">{{ detail.info.email || '—' }}</el-descriptions-item>
              <el-descriptions-item label="身份证号">{{ detail.info.idCard || '—' }}</el-descriptions-item>
              <el-descriptions-item label="工作地点">{{ detail.info.workLocation || '—' }}</el-descriptions-item>
              <el-descriptions-item label="入职日期">{{ detail.info.hireDate }}</el-descriptions-item>
              <el-descriptions-item label="转正日期">{{ detail.info.regularDate || '—' }}</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
          <el-tab-pane :label="`任职记录（${detail.jobRecords.length}）`">
            <el-table :data="detail.jobRecords" border size="small">
              <el-table-column prop="deptName" label="部门" width="120" />
              <el-table-column prop="positionName" label="职位" width="160" />
              <el-table-column prop="recordType" label="类型" width="80" />
              <el-table-column prop="startDate" label="生效日期" width="100" />
              <el-table-column label="结束日期" width="100">
                <template #default="{ row }">{{ row.isCurrent ? '至今' : (row.endDate || '—') }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane :label="`绩效（${detail.perfRecords.length}）`">
            <el-table :data="detail.perfRecords" border size="small">
              <el-table-column prop="periodName" label="考核周期" width="130" />
              <el-table-column prop="grade" label="等级" width="70" />
              <el-table-column prop="score" label="得分" width="80" />
              <el-table-column prop="evaluator" label="评定人" width="100" />
              <el-table-column prop="evalDate" label="评定日期" />
            </el-table>
            <el-empty v-if="!detail.perfRecords.length" description="暂无绩效记录" :image-size="60" />
          </el-tab-pane>
          <el-tab-pane :label="`合同信息（${detail.contracts.length}）`">
            <el-table :data="detail.contracts" border size="small">
              <el-table-column prop="contractNo" label="合同编号" width="160" />
              <el-table-column prop="contractType" label="类型" width="110" />
              <el-table-column prop="startDate" label="生效日期" width="100" />
              <el-table-column label="到期日期" width="100">
                <template #default="{ row }">{{ row.endDate || '无固定' }}</template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="90" />
            </el-table>
            <el-empty v-if="!detail.contracts.length" description="暂无合同记录" :image-size="60" />
          </el-tab-pane>
          <el-tab-pane :label="`附件资料（${detail.attachments.length}）`">
            <el-table :data="detail.attachments" border size="small">
              <el-table-column prop="fileName" label="附件名称" />
              <el-table-column prop="fileType" label="类型" width="80" />
              <el-table-column prop="uploader" label="上传人" width="90" />
              <el-table-column prop="uploadDate" label="上传日期" width="100" />
            </el-table>
            <el-empty v-if="!detail.attachments.length" description="暂无附件" :image-size="60" />
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { getEmployeePage, getEmployeeDetail } from '../../api/employee'
import { getDeptTree } from '../../api/org'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const deptTree = ref([])
const deptPath = ref(null)
const hireRange = ref(null)
const query = ref({ keyword: '', deptId: null, empStatus: '', pageNum: 1, pageSize: 10 })
const drawer = ref(false)
const detail = ref(null)

async function load(reset) {
  if (reset) query.value.pageNum = 1
  loading.value = true
  try {
    const params = {
      ...query.value,
      deptId: deptPath.value ? Number(deptPath.value[deptPath.value.length - 1]) : undefined,
      empStatus: query.value.empStatus || undefined,
      keyword: query.value.keyword || undefined,
      hireDateStart: hireRange.value?.[0],
      hireDateEnd: hireRange.value?.[1]
    }
    const data = await getEmployeePage(params)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

async function openDetail(row) {
  detail.value = await getEmployeeDetail(row.id)
  drawer.value = true
}

onMounted(async () => {
  load()
  deptTree.value = await getDeptTree()
})
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
</style>
