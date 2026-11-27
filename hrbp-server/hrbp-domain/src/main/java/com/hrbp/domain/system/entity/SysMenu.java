package com.hrbp.domain.system.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hrbp.domain.common.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_menu")
public class SysMenu extends BaseEntity {
    private Long parentId;
    private String menuName;
    /** M目录 C菜单 B按钮 */
    private String menuType;
    private String path;
    private String icon;
    private String permCode;
    private Integer sort;
    private Integer status;
}
