import request from './request'

// 入职
export const getOnboardingPage = params => request.get('/flow/onboarding/page', { params })
export const createOnboarding = data => request.post('/flow/onboarding', data)
export const confirmOnboarding = id => request.post(`/flow/onboarding/${id}/confirm`)
export const absentOnboarding = (id, data) => request.post(`/flow/onboarding/${id}/absent`, data)
// 转正
export const getRegPage = params => request.get('/flow/regularization/page', { params })
export const submitRegEval = (id, data) => request.post(`/flow/regularization/${id}/eval`, data)
export const approveReg = (id, pass) => request.post(`/flow/regularization/${id}/approve`, { pass })
// 异动
export const getMovementPage = params => request.get('/flow/movement/page', { params })
export const createMovement = data => request.post('/flow/movement', data)
export const submitMovement = id => request.post(`/flow/movement/${id}/submit`)
export const approveMovement = (id, pass) => request.post(`/flow/movement/${id}/approve`, { pass })
// 离职
export const getOffboardingPage = params => request.get('/flow/offboarding/page', { params })
export const createOffboarding = data => request.post('/flow/offboarding', data)
export const submitOffboarding = id => request.post(`/flow/offboarding/${id}/submit`)
export const approveOffboarding = (id, pass) => request.post(`/flow/offboarding/${id}/approve`, { pass })
export const updateHandover = (id, handoverStatus) => request.post(`/flow/offboarding/${id}/handover`, { handoverStatus })
export const confirmOffboarding = id => request.post(`/flow/offboarding/${id}/confirm`)
// 合同
export const getContractPage = params => request.get('/flow/contract/page', { params })
export const signContract = id => request.post(`/flow/contract/${id}/sign`)
export const renewContract = (id, newEndDate) => request.post(`/flow/contract/${id}/renew`, { newEndDate })
export const releaseContract = (id, reason) => request.post(`/flow/contract/${id}/release`, { reason })
// 成长记录
export const getGrowthPage = params => request.get('/flow/growth/page', { params })
export const getGrowthTimeline = empId => request.get(`/flow/growth/timeline/${empId}`)
