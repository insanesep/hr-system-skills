import request from './request'

export const getAttRecordPage = params => request.get('/att/record/page', { params })
export const punch = data => request.post('/att/record/punch', data)
export const getLeavePage = params => request.get('/att/leave/page', { params })
export const createLeave = data => request.post('/att/leave', data)
export const approveLeave = (id, pass) => request.post(`/att/leave/${id}/approve`, { pass })
export const getMonthPage = params => request.get('/att/month/page', { params })
export const changeMonthStatus = (id, status) => request.post(`/att/month/${id}/status/${status}`)
