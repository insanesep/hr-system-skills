package com.hrbp.web.controller;

import com.hrbp.api.dto.auth.LoginReq;
import com.hrbp.api.dto.auth.LoginResp;
import com.hrbp.api.dto.auth.UserInfoResp;
import com.hrbp.common.core.Result;
import com.hrbp.common.security.UserContext;
import com.hrbp.domain.system.entity.SysMenu;
import com.hrbp.service.system.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/login")
    public Result<LoginResp> login(@Validated @RequestBody LoginReq req) {
        return Result.ok(new LoginResp(authService.login(req.getUsername(), req.getPassword())));
    }

    @GetMapping("/info")
    public Result<UserInfoResp> info() {
        return Result.ok(authService.userInfo(UserContext.userId()));
    }

    @GetMapping("/menus")
    public Result<List<SysMenu>> menus() {
        var lu = UserContext.get();
        return Result.ok(authService.listUserMenus(lu.getUserId(), lu.isAdmin()));
    }
}
