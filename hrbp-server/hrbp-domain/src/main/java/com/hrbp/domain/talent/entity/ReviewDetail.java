package com.hrbp.domain.talent.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("review_detail")
public class ReviewDetail extends BaseEntity {
    private Long cycleId;
    private Long empId;
    private String empName;
    private String deptName;
    private String positionName;
    private String jobLevel;
    private String matchLevel;
    private String matchNote;
    private String potential;
    private String potentialNote;
    private Integer isKeyPosition;
    private String keyDevelop;
    private String managerAction;
}
