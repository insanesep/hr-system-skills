package com.hrbp.domain.employee.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("emp_contract")
public class EmpContract extends BaseEntity {
    private Long empId;
    private String contractNo;
    private String contractType;
    private LocalDate signDate;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
}
