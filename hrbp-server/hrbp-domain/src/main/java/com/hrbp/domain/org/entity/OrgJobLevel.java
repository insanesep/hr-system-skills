package com.hrbp.domain.org.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("org_job_level")
public class OrgJobLevel extends BaseEntity {
    private String levelCode;
    private String sequence;
    private Integer seqNo;
    private String levelCategory;
    private Integer isManagement;
    private Integer status;
}
