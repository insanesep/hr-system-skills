package com.hrbp.domain.recruit.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("recruit_candidate")
public class RecruitCandidate extends BaseEntity {
    private String name;
    private String gender;
    private String phone;
    private String email;
    private String currentCompany;
    private String currentPosition;
    private Integer yearsExp;
    private String education;
    private String expectCity;
    private String sourceChannel;
    private String lockBy;
    private LocalDateTime lockExpire;
    private Integer talentPool;
}
