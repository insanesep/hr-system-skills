import { defineStore } from 'pinia'
import { login, getInfo, getMenus } from '../api/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('hrbp_token') || '',
    userInfo: null,
    menus: [],
    permissions: []
  }),
  actions: {
    async login(form) {
      const data = await login(form)
      this.token = data.token
      localStorage.setItem('hrbp_token', data.token)
    },
    async fetchUser() {
      this.userInfo = await getInfo()
      this.permissions = this.userInfo.permissions || []
      this.menus = await getMenus()
    },
    logout() {
      this.token = ''
      this.userInfo = null
      this.menus = []
      this.permissions = []
      localStorage.removeItem('hrbp_token')
    },
    hasPerm(code) {
      return this.userInfo?.admin || this.permissions.includes(code)
    }
  }
})
