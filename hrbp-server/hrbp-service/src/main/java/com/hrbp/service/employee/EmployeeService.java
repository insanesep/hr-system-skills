package com.hrbp.service.employee;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hrbp.common.core.BizException;
import com.hrbp.common.core.PageResult;
import com.hrbp.domain.employee.entity.EmpAttachment;
import com.hrbp.domain.employee.entity.EmpContract;
import com.hrbp.domain.employee.entity.EmpEmployee;
import com.hrbp.domain.employee.entity.EmpJobRecord;
import com.hrbp.domain.employee.entity.EmpPerfRecord;
import com.hrbp.domain.employee.mapper.EmpAttachmentMapper;
import com.hrbp.domain.employee.mapper.EmpContractMapper;
import com.hrbp.domain.employee.mapper.EmpEmployeeMapper;
import com.hrbp.domain.employee.mapper.EmpJobRecordMapper;
import com.hrbp.domain.employee.mapper.EmpPerfRecordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EmployeeService {
    private final EmpEmployeeMapper employeeMapper;
    private final EmpJobRecordMapper jobRecordMapper;
    private final EmpPerfRecordMapper perfRecordMapper;
    private final EmpContractMapper contractMapper;
    private final EmpAttachmentMapper attachmentMapper;

    /** 员工列表：关键字 + 部门/在职状态/入职日期区间，入职日期倒序 + 工号升序 */
    public PageResult<EmpEmployee> page(String keyword, Long deptId, String empStatus,
                                        String hireDateStart, String hireDateEnd,
                                        long pageNum, long pageSize) {
        LambdaQueryWrapper<EmpEmployee> qw = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            qw.and(w -> w.like(EmpEmployee::getEmpName, keyword)
                    .or().like(EmpEmployee::getEmpNo, keyword)
                    .or().like(EmpEmployee::getPhone, keyword));
        }
        if (deptId != null) qw.eq(EmpEmployee::getDeptId, deptId);
        if (empStatus != null && !empStatus.isBlank()) qw.eq(EmpEmployee::getEmpStatus, empStatus);
        if (hireDateStart != null && !hireDateStart.isBlank()) qw.ge(EmpEmployee::getHireDate, hireDateStart);
        if (hireDateEnd != null && !hireDateEnd.isBlank()) qw.le(EmpEmployee::getHireDate, hireDateEnd);
        qw.orderByDesc(EmpEmployee::getHireDate).orderByAsc(EmpEmployee::getEmpNo);
        Page<EmpEmployee> page = employeeMapper.selectPage(new Page<>(pageNum, pageSize), qw);
        return PageResult.of(page);
    }

    /** 员工明细：基本信息 + 任职记录 + 绩效 + 合同 + 附件 */
    public Map<String, Object> detail(Long id) {
        EmpEmployee emp = employeeMapper.selectById(id);
        if (emp == null) throw new BizException("员工不存在");
        Map<String, Object> result = new HashMap<>();
        result.put("info", emp);
        result.put("jobRecords", jobRecordMapper.selectList(
                new LambdaQueryWrapper<EmpJobRecord>().eq(EmpJobRecord::getEmpId, id).orderByDesc(EmpJobRecord::getStartDate)));
        result.put("perfRecords", perfRecordMapper.selectList(
                new LambdaQueryWrapper<EmpPerfRecord>().eq(EmpPerfRecord::getEmpId, id).orderByDesc(EmpPerfRecord::getEvalDate)));
        result.put("contracts", contractMapper.selectList(
                new LambdaQueryWrapper<EmpContract>().eq(EmpContract::getEmpId, id).orderByDesc(EmpContract::getStartDate)));
        result.put("attachments", attachmentMapper.selectList(
                new LambdaQueryWrapper<EmpAttachment>().eq(EmpAttachment::getEmpId, id).orderByDesc(EmpAttachment::getUploadDate)));
        return result;
    }

    public List<EmpEmployee> listAll() {
        return employeeMapper.selectList(new LambdaQueryWrapper<EmpEmployee>()
                .eq(EmpEmployee::getEmpStatus, "在职").orderByAsc(EmpEmployee::getEmpNo));
    }
}
