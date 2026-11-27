package com.hrbp.domain.est.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("est_incumbent")
public class EstIncumbent extends BaseEntity {
    private Long estLineId;
    private Long empId;
    private String empNo;
    private String empName;
    private String source;
    private String confirmStatus;
    private String overRemark;
}
