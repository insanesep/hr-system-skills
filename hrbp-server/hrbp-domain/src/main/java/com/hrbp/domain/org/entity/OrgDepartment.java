package com.hrbp.domain.org.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("org_department")
public class OrgDepartment extends BaseEntity {
    private Long parentId;
    private String deptName;
    private String deptCode;
    private String levelType;
    private String deptPath;
    private Long leaderId;
    private Integer quota;
    private Integer sort;
    private Integer status;
    private LocalDate foundDate;
    private LocalDate revokeDate;
    private String remark;
}
