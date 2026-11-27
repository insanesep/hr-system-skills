package com.hrbp.domain.flow.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDate;
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("mv_movement")
public class MvMovement extends BaseEntity {
    private String mvNo;
    private Long empId;
    private String empName;
    private String mvType;
    private String fromDept;
    private String fromPosition;
    private String fromLevel;
    private Long toDeptId;
    private String toDept;
    private String toPosition;
    private String toLevel;
    private String reason;
    private LocalDate effectiveDate;
    private String docStatus;
}
