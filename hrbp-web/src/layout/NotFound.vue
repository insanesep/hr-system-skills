<template>
  <el-result icon="warning" title="页面建设中" sub-title="该功能页面将在后续迭代中交付">
    <template #extra>
      <el-button type="primary" @click="$router.push('/')">返回工作台</el-button>
    </template>
  </el-result>
</template>
