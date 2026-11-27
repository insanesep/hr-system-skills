package com.hrbp.domain.perf.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("perf_review")
public class PerfReview extends BaseEntity {
    private Long periodId;
    private Long empId;
    private String empName;
    private String deptName;
    private java.math.BigDecimal selfScore;
    private java.math.BigDecimal managerScore;
    private String suggestGrade;
    private String finalGrade;
    private String followPlan;
    private String nonBReason;
    private String status;
}
