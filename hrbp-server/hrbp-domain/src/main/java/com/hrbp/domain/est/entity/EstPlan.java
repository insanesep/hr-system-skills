package com.hrbp.domain.est.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("est_plan")
public class EstPlan extends BaseEntity {
    private Integer year;
    private String orgName;
    private String levelCategory;
    private Integer originQuota;
    private Integer adjustQuota;
    private String adjustReason;
    private Integer marchHeadcount;
}
