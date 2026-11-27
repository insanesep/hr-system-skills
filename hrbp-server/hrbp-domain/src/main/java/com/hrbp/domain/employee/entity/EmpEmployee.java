package com.hrbp.domain.employee.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("emp_employee")
public class EmpEmployee extends BaseEntity {
    private String empNo;
    private String empName;
    private String gender;
    private LocalDate birthDate;
    private String phone;
    private String email;
    private String idCard;
    private Long deptId;
    private Long positionId;
    private String positionName;
    private String jobLevel;
    private Long directLeaderId;
    private String workLocation;
    private LocalDate hireDate;
    private LocalDate regularDate;
    private String empStatus;
}
