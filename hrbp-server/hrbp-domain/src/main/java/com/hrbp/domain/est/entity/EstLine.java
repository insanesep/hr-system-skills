package com.hrbp.domain.est.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("est_line")
public class EstLine extends BaseEntity {
    private String estNo;
    private String estPlanType;
    private Integer year;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer quota;
    private String deptLv1;
    private String deptLv2;
    private String deptLv3;
    private String deptLv4;
    private String deptLv5;
    private Long deptId;
    private Long positionId;
    private String positionName;
    private String directLeader;
    private String levelSequence;
    private String jobLevel;
    private String levelCategory;
    private String empType;
    private Integer incumbent;
    private Integer recruitHold;
    private String estStatus;
    private String source;
    private String remark;
}
