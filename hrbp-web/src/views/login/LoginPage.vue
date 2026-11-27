<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <el-icon :size="34" color="#4a6cf7"><Suitcase /></el-icon>
        <h1>HRBP 人资管理系统</h1>
        <p>组织 · 人才 · 效能一体化平台</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="submit">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" :prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" show-password :prefix-icon="Lock" />
        </el-form-item>
        <el-button type="primary" class="submit" :loading="loading" @click="submit">登 录</el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../store/auth'

const router = useRouter()
const auth = useAuthStore()
const formRef = ref()
const loading = ref(false)
const form = reactive({ username: 'admin', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function submit() {
  await formRef.value.validate()
  loading.value = true
  try {
    await auth.login(form)
    ElMessage.success('登录成功')
    router.push('/')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page { height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1d2540 0%, #2b3a67 60%, #3d5a99 100%); }
.login-card { width: 400px; background: #fff; border-radius: 12px; padding: 40px 36px; box-shadow: 0 12px 40px rgba(0,0,0,.25); }
.brand { text-align: center; margin-bottom: 28px; }
.brand h1 { font-size: 20px; margin: 10px 0 6px; color: #1d2540; }
.brand p { font-size: 13px; color: #999; }
.submit { width: 100%; margin-top: 6px; }
</style>
