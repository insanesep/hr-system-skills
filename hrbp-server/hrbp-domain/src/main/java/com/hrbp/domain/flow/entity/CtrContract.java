package com.hrbp.domain.flow.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDate;
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ctr_contract")
public class CtrContract extends BaseEntity {
    private String contractNo;
    private Long empId;
    private String empName;
    private String contractType;
    private LocalDate signDate;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private String sourceType;
    private String originNo;
    private LocalDate releaseDate;
    private String releaseReason;
}
