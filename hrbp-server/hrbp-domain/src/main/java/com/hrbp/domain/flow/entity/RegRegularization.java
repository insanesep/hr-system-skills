package com.hrbp.domain.flow.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDate;
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("reg_regularization")
public class RegRegularization extends BaseEntity {
    private String regNo;
    private String onboardNo;
    private Long empId;
    private String empName;
    private String deptName;
    private String positionName;
    private String jobLevel;
    private LocalDate trialStart;
    private LocalDate trialEnd;
    private Integer trialMonths;
    private String regType;
    private java.math.BigDecimal evalScore;
    private String evalConclusion;
    private String docStatus;
    private LocalDate actualDate;
}
