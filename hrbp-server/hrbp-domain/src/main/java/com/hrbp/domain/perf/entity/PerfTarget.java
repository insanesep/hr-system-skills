package com.hrbp.domain.perf.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("perf_target")
public class PerfTarget extends BaseEntity {
    private Long periodId;
    private String ownerType;
    private Long empId;
    private String empName;
    private String deptName;
    private String title;
    private String metricDesc;
    private String standard;
    private Integer weight;
    private Integer progress;
    private String status;
    private Integer version;
}
