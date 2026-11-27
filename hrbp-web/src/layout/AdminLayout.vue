<template>
  <el-container class="admin-layout">
    <el-aside :width="collapsed ? '64px' : '220px'" class="aside">
      <div class="logo" @click="$router.push('/')">
        <el-icon :size="22"><Suitcase /></el-icon>
        <span v-show="!collapsed">HRBP 人资管理</span>
      </div>
      <el-menu :default-active="$route.path" :collapse="collapsed" router unique-opened
               background-color="#1d2540" text-color="#a8b0c8" active-text-color="#ffffff">
        <template v-for="menu in menuTree" :key="menu.id">
          <el-sub-menu v-if="menu.children?.length" :index="menu.path || String(menu.id)">
            <template #title>
              <el-icon><component :is="menu.icon || 'Folder'" /></el-icon>
              <span>{{ menu.menuName }}</span>
            </template>
            <el-menu-item v-for="child in menu.children" :key="child.id" :index="child.path">
              <el-icon><component :is="child.icon || 'Document'" /></el-icon>
              <span>{{ child.menuName }}</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="menu.path">
            <el-icon><component :is="menu.icon || 'Document'" /></el-icon>
            <span>{{ menu.menuName }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <el-icon class="collapse-btn" @click="collapsed = !collapsed">
          <Fold v-if="!collapsed" /><Expand v-else />
        </el-icon>
        <div class="spacer" />
        <el-dropdown @command="onCommand">
          <span class="user">
            <el-avatar :size="28">{{ avatarText }}</el-avatar>
            <span class="name">{{ auth.userInfo?.realName || auth.userInfo?.username }}</span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const auth = useAuthStore()
const router = useRouter()
const collapsed = ref(false)

const menuTree = computed(() => {
  const map = new Map()
  const roots = []
  for (const m of auth.menus) map.set(String(m.id), { ...m, children: [] })
  for (const m of map.values()) {
    const pid = String(m.parentId ?? '0')
    if (pid !== '0' && map.has(pid)) map.get(pid).children.push(m)
    else roots.push(m)
  }
  return roots
})

const avatarText = computed(() => (auth.userInfo?.realName || auth.userInfo?.username || 'U').slice(0, 1))

function onCommand(cmd) {
  if (cmd === 'logout') {
    auth.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.admin-layout { height: 100vh; }
.aside { background: #1d2540; transition: width .2s; }
.logo { height: 56px; display: flex; align-items: center; gap: 8px; padding: 0 16px; color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; }
.aside :deep(.el-menu) { border-right: none; }
.header { display: flex; align-items: center; border-bottom: 1px solid #eee; background: #fff; }
.collapse-btn { cursor: pointer; font-size: 18px; }
.spacer { flex: 1; }
.user { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.user .name { font-size: 14px; color: #333; }
.main { background: #f5f6fa; padding: 16px; }
</style>
