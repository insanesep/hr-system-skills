import request from './request'

export const getEmployeePage = params => request.get('/employee/page', { params })
export const getEmployeeDetail = id => request.get(`/employee/${id}`)
export const getAllEmployees = () => request.get('/employee/all')
