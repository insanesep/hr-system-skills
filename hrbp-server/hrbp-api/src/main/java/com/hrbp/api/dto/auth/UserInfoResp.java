package com.hrbp.api.dto.auth;

import lombok.Data;

import java.util.Set;

@Data
public class UserInfoResp {
    private String userId;
    private String username;
    private String realName;
    private Set<String> permissions;
    private boolean admin;
}
