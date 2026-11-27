package com.hrbp.domain.employee.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("emp_perf_record")
public class EmpPerfRecord extends BaseEntity {
    private Long empId;
    private String periodName;
    private String grade;
    private BigDecimal score;
    private String evaluator;
    private LocalDate evalDate;
}
