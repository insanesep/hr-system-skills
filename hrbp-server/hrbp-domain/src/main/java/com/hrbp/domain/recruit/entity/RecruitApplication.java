package com.hrbp.domain.recruit.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("recruit_application")
public class RecruitApplication extends BaseEntity {
    private Long jobId;
    private Long demandId;
    private Long candidateId;
    private String applyStatus;
    private String entrySource;
    private Integer preHold;
    private String firstResult;
    private String secondResult;
    private String finalResult;
    private LocalDate onboardDate;
    private Integer isHired;
    private String quitReason;
    private String actualLevel;
}
