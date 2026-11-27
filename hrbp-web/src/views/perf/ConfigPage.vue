<template>
  <div>
    <el-card shadow="never" style="margin-bottom:12px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>考核周期与阶段</span>
        </div>
      </template>
      <el-table :data="periods" border>
        <el-table-column prop="periodName" label="周期" width="120" />
        <el-table-column prop="periodType" label="类型" width="80" />
        <el-table-column label="起止" width="200">
          <template #default="{ row }">{{ row.startDate }} ~ {{ row.endDate }}</template>
        </el-table-column>
        <el-table-column prop="stage" label="当前阶段" width="120">
          <template #default="{ row }"><el-tag size="small">{{ row.stage }}</el-tag></template>
        </el-table-column>
        <el-table-column label="阶段推进" min-width="300">
          <template #default="{ row }">
            <el-button v-for="s in nextStages(row.stage)" :key="s" size="small" link type="primary" @click="onAdvance(row, s)">
              → {{ s }}
            </el-button>
            <span v-if="!nextStages(row.stage).length" style="color:#bbb">已归档</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header>评级与系数参数</template>
      <el-table :data="grades" border>
        <el-table-column prop="grade" label="等级" width="80">
          <template #default="{ row }"><el-tag>{{ row.grade }}</el-tag></template>
        </el-table-column>
        <el-table-column label="分数下限" width="150">
          <template #default="{ row }">
            <el-input-number v-model="row.scoreFloor" :min="0" :max="100" size="small" @change="row._dirty = true" />
          </template>
        </el-table-column>
        <el-table-column label="绩效系数" width="150">
          <template #default="{ row }">
            <el-input-number v-model="row.coefficient" :min="0" :max="3" :step="0.1" size="small" @change="row._dirty = true" />
          </template>
        </el-table-column>
        <el-table-column label="分布基线%" width="150">
          <template #default="{ row }">
            <el-input-number v-model="row.distributionPct" :min="0" :max="100" size="small" @change="row._dirty = true" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-button link type="primary" :disabled="!row._dirty" @click="onSave(row)">保存</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getPeriods, advanceStage, getGradeConfigs, saveGradeConfig } from '../../api/perf'

const periods = ref([])
const grades = ref([])
const STAGES = ['目标设定', '目标已生效', '自评中', '上级评价中', '团队通晒', '中心通晒', '结果已生效', '已归档']

function nextStages(stage) {
  const i = STAGES.indexOf(stage)
  return i >= 0 && i < STAGES.length - 1 ? [STAGES[i + 1]] : []
}

async function load() {
  periods.value = await getPeriods()
  grades.value = await getGradeConfigs()
}

async function onAdvance(row, stage) {
  await advanceStage(row.id, stage)
  ElMessage.success('已推进至 ' + stage)
  load()
}

async function onSave(row) {
  await saveGradeConfig({ id: Number(row.id), grade: row.grade, scoreFloor: row.scoreFloor, coefficient: row.coefficient, distributionPct: row.distributionPct })
  ElMessage.success('已保存')
  load()
}

onMounted(load)
</script>
