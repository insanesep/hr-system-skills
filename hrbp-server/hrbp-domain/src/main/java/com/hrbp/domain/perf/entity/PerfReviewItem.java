package com.hrbp.domain.perf.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("perf_review_item")
public class PerfReviewItem extends BaseEntity {
    private Long reviewId;
    private String targetTitle;
    private Integer weight;
    private java.math.BigDecimal selfScore;
    private String selfComment;
    private java.math.BigDecimal managerScore;
    private String managerComment;
}
