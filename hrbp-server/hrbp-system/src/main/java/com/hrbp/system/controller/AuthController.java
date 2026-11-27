package com.hrbp.system.controller;

import com.hrbp.common.core.Result;
import com.hrbp.common.security.UserContext;
import com.hrbp.system.entity.SysMenu;
import com.hrbp.system.service.AuthService;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/login")
    public Result<Map<String, String>> login(@Validated @RequestBody LoginReq req) {
        String token = authService.login(req.getUsername(), req.getPassword());
        return Result.ok(Map.of("token", token));
    }

    @GetMapping("/info")
    public Result<Map<String, Object>> info() {
        return Result.ok(authService.userInfo(UserContext.userId()));
    }

    @GetMapping("/menus")
    public Result<List<SysMenu>> menus() {
        var lu = UserContext.get();
        return Result.ok(authService.listUserMenus(lu.getUserId(), lu.isAdmin()));
    }

    @Data
    public static class LoginReq {
        @NotBlank(message = "用户名不能为空")
        private String username;
        @NotBlank(message = "密码不能为空")
        private String password;
    }
}
