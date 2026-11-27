package com.hrbp.domain.recruit.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("recruit_offer")
public class RecruitOffer extends BaseEntity {
    private String offerNo;
    private Long applicationId;
    private String candidateName;
    private String positionName;
    private String jobLevel;
    private BigDecimal monthlyBase;
    private BigDecimal monthlyPerf;
    private BigDecimal annualBonusMonths;
    private BigDecimal signBonus;
    private BigDecimal annualPackage;
    private String offerStatus;
    private LocalDate validUntil;
    private LocalDate onboardDate;
}
