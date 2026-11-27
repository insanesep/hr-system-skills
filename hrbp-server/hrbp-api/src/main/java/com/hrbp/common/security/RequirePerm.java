package com.hrbp.common.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** 按钮/接口级权限校验，值为权限码，如 BTN:HR_EMPLOYEE:DETAIL */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequirePerm {
    String value();
}
