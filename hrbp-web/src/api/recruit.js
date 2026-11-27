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

// 招聘过程
export const getProcessStats = () => request.get('/recruit/process/stats')
export const getJobs = params => request.get('/recruit/process/jobs', { params })
export const createJob = data => request.post('/recruit/process/jobs', data)
export const changeJobStatus = (id, status) => request.post(`/recruit/process/jobs/${id}/status/${status}`)
export const getCandidates = params => request.get('/recruit/process/candidates', { params })
export const saveCandidate = data => request.post('/recruit/process/candidates', data)
export const lockCandidate = (id, lock) => request.post(`/recruit/process/candidates/${id}/lock/${lock}`)
export const getApplications = params => request.get('/recruit/process/applications', { params })
export const createApplication = data => request.post('/recruit/process/applications', data)
export const changeApplyStatus = (id, data) => request.post(`/recruit/process/applications/${id}/status`, data)
export const getInterviews = params => request.get('/recruit/process/interviews', { params })
export const createInterview = data => request.post('/recruit/process/interviews', data)
export const submitConclusion = (id, data) => request.post(`/recruit/process/interviews/${id}/conclusion`, data)
export const getOffers = params => request.get('/recruit/process/offers', { params })
export const createOffer = data => request.post('/recruit/process/offers', data)
export const offerAction = (id, action) => request.post(`/recruit/process/offers/${id}/${action}`)

// 招聘看板
export const getDashboard = () => request.get('/recruit/dashboard')
