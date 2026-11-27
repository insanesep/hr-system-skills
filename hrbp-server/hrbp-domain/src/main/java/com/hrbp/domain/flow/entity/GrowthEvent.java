package com.hrbp.domain.flow.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDate;
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("growth_event")
public class GrowthEvent extends BaseEntity {
    private String eventNo;
    private Long empId;
    private String empNo;
    private String empName;
    private String eventType;
    private LocalDate eventDate;
    private String title;
    private String summary;
    private String sourceModule;
    private String sourceNo;
    private String eventStatus;
    private String idemKey;
}
