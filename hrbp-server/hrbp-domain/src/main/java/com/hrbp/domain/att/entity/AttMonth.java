package com.hrbp.domain.att.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("att_month")
public class AttMonth extends BaseEntity {
    private Long empId;
    private String empName;
    private String month;
    private Integer shouldDays;
    private Integer actualDays;
    private Integer lateCount;
    private Integer earlyCount;
    private Integer missCount;
    private Integer absentCount;
    private java.math.BigDecimal leaveHours;
    private java.math.BigDecimal overtimeHours;
    private Integer travelDays;
    private String status;
}
