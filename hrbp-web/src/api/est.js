import request from './request'

export const getEstPage = params => request.get('/est/page', { params })
export const getEstStats = params => request.get('/est/stats', { params })
export const createEst = data => request.post('/est', data)
export const adjustEst = (id, data) => request.post(`/est/${id}/adjust`, data)
export const approveEst = (id, data) => request.post(`/est/${id}/approve`, data)
export const toggleEst = (id, data) => request.post(`/est/${id}/status`, data)
export const getOutsourceOver = () => request.get('/est/outsource-over')
export const getIncumbents = id => request.get(`/est/${id}/incumbents`)
export const confirmIncumbent = (id, data) => request.post(`/est/incumbents/${id}/confirm`, data)
export const getEstLogs = id => request.get(`/est/${id}/logs`)
export const getEstPlans = year => request.get('/est/plans', { params: { year } })
export const saveEstPlan = data => request.post('/est/plans', data)
