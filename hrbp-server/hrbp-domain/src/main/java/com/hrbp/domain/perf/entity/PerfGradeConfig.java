package com.hrbp.domain.perf.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("perf_grade_config")
public class PerfGradeConfig extends BaseEntity {
    private String grade;
    private java.math.BigDecimal scoreFloor;
    private java.math.BigDecimal coefficient;
    private Integer distributionPct;
}
