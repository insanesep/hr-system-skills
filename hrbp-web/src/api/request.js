import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'

const request = axios.create({ baseURL: '/api', timeout: 30000 })

request.interceptors.request.use(config => {
  const token = localStorage.getItem('hrbp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

request.interceptors.response.use(
  res => {
    const body = res.data
    if (body.code === 0) return body.data
    if (body.code === 401) {
      localStorage.removeItem('hrbp_token')
      router.push('/login')
    }
    ElMessage.error(body.message || '请求失败')
    return Promise.reject(new Error(body.message))
  },
  err => {
    ElMessage.error(err.message || '网络异常')
    return Promise.reject(err)
  }
)

export default request
