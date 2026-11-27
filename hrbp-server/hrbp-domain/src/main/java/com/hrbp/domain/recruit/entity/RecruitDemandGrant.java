package com.hrbp.domain.recruit.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("recruit_demand_grant")
public class RecruitDemandGrant extends BaseEntity {
    private Long demandId;
    private String granteeName;
    private String grantBy;
    private Integer revoked;
}
