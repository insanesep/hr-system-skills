package com.hrbp.domain.flow.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDate;
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("off_offboarding")
public class OffOffboarding extends BaseEntity {
    private String offNo;
    private Long empId;
    private String empName;
    private String deptName;
    private String positionName;
    private String offType;
    private String offReason;
    private LocalDate lastWorkDate;
    private String handoverStatus;
    private String docStatus;
}
