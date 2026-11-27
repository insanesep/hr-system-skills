package com.hrbp.domain.org.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("org_job_family")
public class OrgJobFamily extends BaseEntity {
    private String familyCode;
    private String familyName;
    private String levelRange;
    private String buildStatus;
    private String remark;
}
