package com.hrbp.domain.employee.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("emp_job_record")
public class EmpJobRecord extends BaseEntity {
    private Long empId;
    private Long deptId;
    private String deptName;
    private String positionName;
    private String recordType;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer isCurrent;
}
