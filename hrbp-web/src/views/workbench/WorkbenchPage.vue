<template>
  <div v-loading="loading">
    <!-- 数据卡 -->
    <el-row :gutter="12" style="margin-bottom:12px">
      <el-col :span="4" v-for="c in overviewCards" :key="c.label">
        <el-card shadow="hover" class="stat-card">
          <div class="label">{{ c.label }}</div>
          <div class="value" :style="{ color: c.color }">{{ c.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12">
      <!-- 待办 -->
      <el-col :span="10">
        <el-card shadow="never">
          <template #header><b>待办事项</b></template>
          <div class="todo-list">
            <div v-for="t in data.todos" :key="t.label" class="todo-item" @click="$router.push(t.path)">
              <span>{{ t.label }}</span>
              <el-badge :value="t.count" :type="t.count > 0 ? 'danger' : 'info'" />
            </div>
          </div>
        </el-card>
      </el-col>
      <!-- 预警 -->
      <el-col :span="14">
        <el-card shadow="never">
          <template #header><b>预警</b></template>
          <el-table :data="data.alerts" size="small" :show-header="false">
            <el-table-column width="70">
              <template #default="{ row }">
                <el-tag size="small" :type="{ 高: 'danger', 中: 'warning', 低: 'info' }[row.level]">{{ row.level }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="type" width="90" />
            <el-table-column prop="content" />
            <el-table-column width="70">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="$router.push(row.path)">去处理</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!data.alerts?.length" description="暂无预警" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import request from '../../api/request'

const loading = ref(true)
const data = ref({ todos: [], alerts: [], overview: {} })

const overviewCards = computed(() => {
  const o = data.value.overview || {}
  return [
    { label: '在编人数', value: o.activeEmployees ?? '—', color: '#1d2540' },
    { label: '可用缺额', value: o.vacancyTotal ?? '—', color: '#67c23a' },
    { label: '在招需求', value: o.recruitingDemands ?? '—', color: '#409eff' },
    { label: '本月入职', value: o.monthHired ?? '—', color: '#67c23a' },
    { label: '本月离职', value: o.monthOffboard ?? '—', color: '#f56c6c' }
  ]
})

onMounted(async () => {
  data.value = await request.get('/workbench')
  loading.value = false
})
</script>

<style scoped>
.stat-card .label { font-size: 12px; color: #999; }
.stat-card .value { font-size: 24px; font-weight: 600; margin-top: 6px; }
.todo-list .todo-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 8px; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
.todo-list .todo-item:hover { background: #f8f9fc; }
</style>
