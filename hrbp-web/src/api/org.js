import request from './request'

// 部门
export const getDeptTree = keyword => request.get('/org/department/tree', { params: { keyword } })
export const createDept = data => request.post('/org/department', data)
export const updateDept = data => request.put('/org/department', data)
export const deleteDept = id => request.delete(`/org/department/${id}`)
export const toggleDeptStatus = (id, status) => request.post(`/org/department/${id}/status/${status}`)

// 岗位
export const getLevelMatrix = () => request.get('/org/position/level-matrix')
export const getFamilies = () => request.get('/org/position/families')
export const saveFamily = data => request.post('/org/position/families', data)
export const getPositions = params => request.get('/org/position/list', { params })
export const createPosition = data => request.post('/org/position', data)
export const updatePosition = data => request.put('/org/position', data)
export const changePositionStatus = (id, status) => request.post(`/org/position/${id}/status/${status}`)
