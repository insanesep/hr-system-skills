package com.hrbp.domain.perf.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDate;
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("perf_period")
public class PerfPeriod extends BaseEntity {
    private String periodName;
    private String periodType;
    private LocalDate startDate;
    private LocalDate endDate;
    private String stage;
}
