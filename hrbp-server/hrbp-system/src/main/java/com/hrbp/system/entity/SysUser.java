package com.hrbp.system.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.common.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_user")
public class SysUser extends BaseEntity {
    private String username;
    private String password;
    private String realName;
    private String email;
    private String phone;
    private String avatar;
    /** 0 停用 1 启用 */
    private Integer status;
}
