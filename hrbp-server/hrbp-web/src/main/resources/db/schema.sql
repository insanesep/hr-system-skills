-- hrbp 数据库初始化脚本
CREATE DATABASE IF NOT EXISTS hrbp DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE hrbp;

-- ========== 系统域 ==========
CREATE TABLE IF NOT EXISTS sys_user (
    id BIGINT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password VARCHAR(128) NOT NULL,
    real_name VARCHAR(64),
    email VARCHAR(128),
    phone VARCHAR(32),
    avatar VARCHAR(512),
    status TINYINT DEFAULT 1 COMMENT '0停用 1启用',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sys_role (
    id BIGINT PRIMARY KEY,
    role_code VARCHAR(64) NOT NULL UNIQUE,
    role_name VARCHAR(64) NOT NULL,
    remark VARCHAR(512),
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sys_menu (
    id BIGINT PRIMARY KEY,
    parent_id BIGINT DEFAULT 0,
    menu_name VARCHAR(64) NOT NULL,
    menu_type CHAR(1) NOT NULL COMMENT 'M目录 C菜单 B按钮',
    path VARCHAR(256),
    icon VARCHAR(64),
    perm_code VARCHAR(128),
    sort INT DEFAULT 0,
    status TINYINT DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sys_user_role (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    UNIQUE KEY uk_user_role (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS sys_role_menu (
    id BIGINT PRIMARY KEY,
    role_id BIGINT NOT NULL,
    menu_id BIGINT NOT NULL,
    UNIQUE KEY uk_role_menu (role_id, menu_id)
);
