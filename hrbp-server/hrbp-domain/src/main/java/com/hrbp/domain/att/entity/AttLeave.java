package com.hrbp.domain.att.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("att_leave")
public class AttLeave extends BaseEntity {
    private String leaveNo;
    private Long empId;
    private String empName;
    private String leaveType;
    private String subType;
    private java.time.LocalDateTime startTime;
    private java.time.LocalDateTime endTime;
    private java.math.BigDecimal hours;
    private String reason;
    private String approveStatus;
}
