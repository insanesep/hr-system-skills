package com.hrbp.domain.recruit.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("recruit_demand")
public class RecruitDemand extends BaseEntity {
    private String demandNo;
    private String recruitQuarter;
    private Long estLineId;
    private Long deptId;
    private String deptPath;
    private Long positionId;
    private String positionName;
    private String jobLevel;
    private String levelCategory;
    private String jobCategory;
    private String jobFamily;
    private String workNature;
    private String empType;
    private Integer headcount;
    private Integer arrived;
    private Integer offered;
    private Integer accepted;
    private Integer inTransit;
    private String demandStatus;
    private String warningFlag;
    private LocalDate expectDate;
    private String finalInterviewer;
    private String recruitOwner;
    private String collaborateHr;
    private Integer outsourceFlag;
}
