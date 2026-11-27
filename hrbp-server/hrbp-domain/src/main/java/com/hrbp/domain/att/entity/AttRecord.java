package com.hrbp.domain.att.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDate;
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("att_record")
public class AttRecord extends BaseEntity {
    private Long empId;
    private String empName;
    private LocalDate attDate;
    private String shiftName;
    private java.time.LocalTime checkIn;
    private java.time.LocalTime checkOut;
    private String dayStatus;
    private String exceptionType;
    private String dataSource;
}
