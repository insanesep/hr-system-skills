package com.hrbp.domain.flow.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDate;
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ob_onboarding")
public class ObOnboarding extends BaseEntity {
    private String onboardNo;
    private Long offerId;
    private String empName;
    private String phone;
    private Long deptId;
    private String deptName;
    private String positionName;
    private String jobLevel;
    private LocalDate planDate;
    private LocalDate actualDate;
    private String onboardResult;
    private String docStatus;
    private String collectStatus;
    private String materialStatus;
    private Long empId;
    private String remark;
}
