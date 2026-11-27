package com.hrbp.domain.talent.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("talent_record")
public class TalentRecord extends BaseEntity {
    private String recordNo;
    private Long empId;
    private String empName;
    private String recordType;
    private Integer version;
    private String content;
    private LocalDate recordDate;
    private String status;
    private String revokeReason;
    private String editReason;
}
