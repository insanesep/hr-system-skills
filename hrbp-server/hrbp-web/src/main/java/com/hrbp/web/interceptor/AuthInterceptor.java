package com.hrbp.web.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrbp.common.core.Result;
import com.hrbp.common.security.JwtUtil;
import com.hrbp.common.security.LoginUser;
import com.hrbp.common.security.RequirePerm;
import com.hrbp.common.security.UserContext;
import com.hrbp.service.system.AuthService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {
    private final AuthService authService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String token = request.getHeader("Authorization");
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        if (token == null || token.isBlank()) {
            writeError(response, 401, "未登录");
            return false;
        }
        Claims claims;
        try {
            claims = JwtUtil.parse(token);
        } catch (Exception e) {
            writeError(response, 401, "登录已过期");
            return false;
        }
        LoginUser loginUser = authService.buildLoginUser(Long.valueOf(claims.getSubject()));
        UserContext.set(loginUser);

        if (handler instanceof HandlerMethod hm) {
            RequirePerm perm = hm.getMethodAnnotation(RequirePerm.class);
            if (perm == null) {
                perm = hm.getBeanType().getAnnotation(RequirePerm.class);
            }
            if (perm != null && !loginUser.isAdmin()
                    && (loginUser.getPermissions() == null || !loginUser.getPermissions().contains(perm.value()))) {
                writeError(response, 403, "无权限：" + perm.value());
                return false;
            }
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContext.clear();
    }

    private void writeError(HttpServletResponse response, int code, String message) throws Exception {
        response.setStatus(200);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(Result.fail(code, message)));
    }
}
