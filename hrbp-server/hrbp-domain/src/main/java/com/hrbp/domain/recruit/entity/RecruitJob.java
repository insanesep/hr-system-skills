package com.hrbp.domain.recruit.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("recruit_job")
public class RecruitJob extends BaseEntity {
    private String jobNo;
    private Long demandId;
    private String positionName;
    private String jobLevel;
    private Integer headcount;
    private Integer hired;
    private String jobStatus;
}
