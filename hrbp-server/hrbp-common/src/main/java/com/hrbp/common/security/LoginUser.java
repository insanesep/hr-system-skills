package com.hrbp.common.security;

import lombok.Data;

import java.util.Set;

@Data
public class LoginUser {
    private Long userId;
    private String username;
    private String realName;
    private Set<String> permissions;
    private boolean admin;
}
