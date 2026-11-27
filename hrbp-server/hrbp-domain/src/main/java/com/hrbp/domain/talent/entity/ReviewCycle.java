package com.hrbp.domain.talent.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("review_cycle")
public class ReviewCycle extends BaseEntity {
    private String cycleName;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
}
