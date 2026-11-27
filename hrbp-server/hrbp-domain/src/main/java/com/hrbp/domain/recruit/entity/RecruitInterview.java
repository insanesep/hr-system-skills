package com.hrbp.domain.recruit.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("recruit_interview")
public class RecruitInterview extends BaseEntity {
    private Long applicationId;
    private String round;
    private LocalDateTime interviewTime;
    private String location;
    private String interviewer;
    private String inviteStatus;
    private String interviewStatus;
    private String conclusion;
    private String comment;
}
