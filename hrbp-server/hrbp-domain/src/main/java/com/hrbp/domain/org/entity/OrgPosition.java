package com.hrbp.domain.org.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("org_position")
public class OrgPosition extends BaseEntity {
    private String positionCode;
    private String positionName;
    private Long familyId;
    private String positionType;
    private String levelMin;
    private String levelMax;
    private String defaultLevel;
    private String defaultEmpType;
    private String status;
    private Integer version;
    private String remark;
}
