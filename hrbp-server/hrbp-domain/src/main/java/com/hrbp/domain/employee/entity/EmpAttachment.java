package com.hrbp.domain.employee.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("emp_attachment")
public class EmpAttachment extends BaseEntity {
    private Long empId;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String filePath;
    private String uploader;
    private LocalDate uploadDate;
}
