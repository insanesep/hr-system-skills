<template>
  <div v-loading="loading">
    <!-- KPI -->
    <el-row :gutter="12" style="margin-bottom:12px">
      <el-col :span="3" v-for="c in kpiCards" :key="c.label">
        <el-card shadow="hover" class="stat-card">
          <div class="label">{{ c.label }}</div>
          <div class="value" :style="{ color: c.color }">{{ c.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>招聘漏斗</template>
          <div ref="funnelRef" style="height:300px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>招聘进度（按需求）</template>
          <div ref="progressRef" style="height:300px" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" style="margin-top:12px">
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>渠道效果</template>
          <div ref="channelRef" style="height:280px" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>Offer 状态分布</template>
          <div ref="offerRef" style="height:280px" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>时效与预警</template>
          <div class="eff-block">
            <div class="eff-item">
              <div class="eff-value">{{ data.efficiency?.avgRecruitDays ?? 0 }} 天</div>
              <div class="eff-label">平均招聘天数</div>
            </div>
            <div class="eff-item">
              <div class="eff-value" style="color:#f56c6c">{{ data.efficiency?.overdueDemands ?? 0 }}</div>
              <div class="eff-label">超期未达成需求</div>
            </div>
            <div class="eff-item">
              <div class="eff-value" style="color:#e6a23c">{{ data.offer?.avgPackage ?? 0 }} 万</div>
              <div class="eff-label">平均年度总包</div>
            </div>
            <div class="eff-item">
              <div class="eff-value">{{ data.offer?.lost ?? 0 }}</div>
              <div class="eff-label">Offer 流失</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { getDashboard } from '../../api/recruit'

const loading = ref(true)
const data = ref({})
const funnelRef = ref()
const progressRef = ref()
const channelRef = ref()
const offerRef = ref()
let charts = []

const kpiCards = computed(() => {
  const k = data.value.kpi || {}
  return [
    { label: '需求总数', value: k.demandTotal ?? '—', color: '#1d2540' },
    { label: '招聘中', value: k.recruiting ?? '—', color: '#409eff' },
    { label: '已完成', value: k.finished ?? '—', color: '#67c23a' },
    { label: '需求人数', value: k.headcountTotal ?? '—', color: '#1d2540' },
    { label: '到岗率', value: (k.arriveRate ?? 0) + '%', color: '#67c23a' },
    { label: '应聘者', value: k.candidateTotal ?? '—', color: '#409eff' },
    { label: 'Offer数', value: k.offerTotal ?? '—', color: '#e6a23c' },
    { label: 'Offer接受率', value: (k.offerAcceptRate ?? 0) + '%', color: '#f56c6c' }
  ]
})

function makeChart(el, option) {
  const c = echarts.init(el)
  c.setOption(option)
  charts.push(c)
}

onMounted(async () => {
  data.value = await getDashboard()
  loading.value = false

  makeChart(funnelRef.value, {
    tooltip: { trigger: 'item', formatter: '{b}: {c} 人' },
    series: [{
      type: 'funnel', left: '8%', width: '84%', sort: 'none', gap: 2,
      label: { show: true, position: 'inside', formatter: '{b}\n{c} 人', fontSize: 12 },
      itemStyle: { borderRadius: 3 },
      data: (data.value.funnel || []).map((f, i) => ({
        name: f.stage, value: f.count,
        itemStyle: { color: ['#5470c6','#73c0de','#3ba272','#fac858','#ee6666','#fc8452','#9a60b4','#67c23a'][i % 8] }
      }))
    }]
  })

  const progress = data.value.progress || []
  makeChart(progressRef.value, {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { left: 40, right: 20, top: 20, bottom: 50 },
    xAxis: { type: 'category', data: progress.map(p => p.demandNo), axisLabel: { fontSize: 10, rotate: 20 } },
    yAxis: [{ type: 'value', name: '人数' }, { type: 'value', name: '到岗率%', max: 100 }],
    series: [
      { name: '需求', type: 'bar', data: progress.map(p => p.headcount), itemStyle: { color: '#5470c6' } },
      { name: '到岗', type: 'bar', data: progress.map(p => p.arrived), itemStyle: { color: '#67c23a' } },
      { name: '到岗率', type: 'line', yAxisIndex: 1, data: progress.map(p => p.rate), itemStyle: { color: '#e6a23c' } }
    ]
  })

  makeChart(channelRef.value, {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie', radius: ['40%', '65%'], center: ['50%', '45%'],
      label: { formatter: '{b}\n{c} 人' },
      data: (data.value.channel || []).map(c => ({ name: c.channel, value: c.candidates }))
    }]
  })

  const byStatus = data.value.offer?.byStatus || {}
  makeChart(offerRef.value, {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie', radius: ['40%', '65%'], center: ['50%', '45%'],
      label: { formatter: '{b}\n{c}' },
      data: Object.entries(byStatus).map(([k, v]) => ({ name: k, value: v }))
    }]
  })
})

onBeforeUnmount(() => {
  charts.forEach(c => c.dispose())
  charts = []
})
</script>

<style scoped>
.stat-card .label { font-size: 12px; color: #999; }
.stat-card .value { font-size: 22px; font-weight: 600; margin-top: 6px; }
.eff-block { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 12px 0; }
.eff-item { text-align: center; padding: 18px 0; background: #f8f9fc; border-radius: 8px; }
.eff-value { font-size: 26px; font-weight: 700; color: #1d2540; }
.eff-label { font-size: 12px; color: #999; margin-top: 6px; }
</style>
