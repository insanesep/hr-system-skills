import request from './request'

// 招聘需求
export const getDemandPage = params => request.get('/recruit/demand/page', { params })
export const getDemandStats = params => request.get('/recruit/demand/stats', { params })
export const getDemandDetail = id => request.get(`/recruit/demand/${id}`)
export const createDemand = data => request.post('/recruit/demand', data)
export const updateDemand = data => request.put('/recruit/demand', data)
export const submitDemand = id => request.post(`/recruit/demand/${id}/submit`)
export const approveDemand = (id, data) => request.post(`/recruit/demand/${id}/approve`, data)
export const closeDemand = (id, data) => request.post(`/recruit/demand/${id}/close`, data)
export const grantDemand = (id, data) => request.post(`/recruit/demand/${id}/grant`, data)
export const revokeGrant = grantId => request.post(`/recruit/demand/grant/${grantId}/revoke`)
