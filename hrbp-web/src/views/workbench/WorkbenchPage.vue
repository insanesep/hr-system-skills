<template>
  <div>
    <el-row :gutter="16">
      <el-col :span="6" v-for="card in cards" :key="card.label">
        <el-card shadow="hover" class="stat-card">
          <div class="label">{{ card.label }}</div>
          <div class="value">{{ card.value }}</div>
        </el-card>
      </el-col>
    </el-row>
    <el-card shadow="never" style="margin-top:16px">
      <template #header>欢迎使用 HRBP 人资管理系统</template>
      <p style="color:#666;line-height:1.8">
        脚手架已就绪：登录鉴权、菜单权限、部门与用户种子数据已完成。<br>
        左侧菜单为需求定义的完整功能树，业务页面将按任务 B ~ G 逐步交付。
      </p>
    </el-card>
  </div>
</template>

<script setup>
const cards = [
  { label: '在编人数', value: '—' },
  { label: '在招需求', value: '—' },
  { label: '本月入职', value: '—' },
  { label: '本月离职', value: '—' }
]
</script>

<style scoped>
.stat-card .label { font-size: 13px; color: #999; }
.stat-card .value { font-size: 26px; font-weight: 600; margin-top: 8px; color: #1d2540; }
</style>
