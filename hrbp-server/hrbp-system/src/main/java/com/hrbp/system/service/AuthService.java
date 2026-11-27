package com.hrbp.system.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrbp.common.core.BizException;
import com.hrbp.common.security.JwtUtil;
import com.hrbp.common.security.LoginUser;
import com.hrbp.system.entity.SysMenu;
import com.hrbp.system.entity.SysRole;
import com.hrbp.system.entity.SysRoleMenu;
import com.hrbp.system.entity.SysUser;
import com.hrbp.system.entity.SysUserRole;
import com.hrbp.system.mapper.SysMenuMapper;
import com.hrbp.system.mapper.SysRoleMapper;
import com.hrbp.system.mapper.SysRoleMenuMapper;
import com.hrbp.system.mapper.SysUserMapper;
import com.hrbp.system.mapper.SysUserRoleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final SysUserMapper userMapper;
    private final SysUserRoleMapper userRoleMapper;
    private final SysRoleMapper roleMapper;
    private final SysRoleMenuMapper roleMenuMapper;
    private final SysMenuMapper menuMapper;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public String login(String username, String password) {
        SysUser user = userMapper.selectOne(new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, username));
        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new BizException(401, "用户名或密码错误");
        }
        if (user.getStatus() != null && user.getStatus() == 0) {
            throw new BizException(403, "账号已停用");
        }
        return JwtUtil.createToken(user.getId(), user.getUsername());
    }

    public LoginUser buildLoginUser(Long userId) {
        SysUser user = userMapper.selectById(userId);
        if (user == null) {
            throw new BizException(401, "用户不存在");
        }
        LoginUser lu = new LoginUser();
        lu.setUserId(user.getId());
        lu.setUsername(user.getUsername());
        lu.setRealName(user.getRealName());
        lu.setAdmin("admin".equals(user.getUsername()));
        lu.setPermissions(loadPermissions(userId, lu.isAdmin()));
        return lu;
    }

    private Set<String> loadPermissions(Long userId, boolean admin) {
        List<SysMenu> menus;
        if (admin) {
            menus = menuMapper.selectList(null);
        } else {
            List<Long> roleIds = userRoleMapper.selectList(new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, userId))
                    .stream().map(SysUserRole::getRoleId).toList();
            if (roleIds.isEmpty()) {
                return Set.of();
            }
            List<Long> menuIds = roleMenuMapper.selectList(new LambdaQueryWrapper<SysRoleMenu>().in(SysRoleMenu::getRoleId, roleIds))
                    .stream().map(SysRoleMenu::getMenuId).distinct().toList();
            menus = menuIds.isEmpty() ? List.of() : menuMapper.selectList(new LambdaQueryWrapper<SysMenu>().in(SysMenu::getId, menuIds));
        }
        Set<String> perms = new HashSet<>();
        for (SysMenu m : menus) {
            if (m.getPermCode() != null && !m.getPermCode().isBlank()) {
                perms.add(m.getPermCode());
            }
        }
        return perms;
    }

    public List<SysMenu> listUserMenus(Long userId, boolean admin) {
        List<SysMenu> menus;
        if (admin) {
            menus = menuMapper.selectList(new LambdaQueryWrapper<SysMenu>().ne(SysMenu::getMenuType, "B"));
        } else {
            List<Long> roleIds = userRoleMapper.selectList(new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, userId))
                    .stream().map(SysUserRole::getRoleId).toList();
            if (roleIds.isEmpty()) {
                return List.of();
            }
            List<Long> menuIds = roleMenuMapper.selectList(new LambdaQueryWrapper<SysRoleMenu>().in(SysRoleMenu::getRoleId, roleIds))
                    .stream().map(SysRoleMenu::getMenuId).distinct().toList();
            if (menuIds.isEmpty()) {
                return List.of();
            }
            menus = menuMapper.selectList(new LambdaQueryWrapper<SysMenu>()
                    .in(SysMenu::getId, menuIds).ne(SysMenu::getMenuType, "B"));
        }
        menus.sort((a, b) -> Integer.compare(a.getSort() == null ? 0 : a.getSort(), b.getSort() == null ? 0 : b.getSort()));
        return menus;
    }

    public Map<String, Object> userInfo(Long userId) {
        LoginUser lu = buildLoginUser(userId);
        return Map.of(
                "userId", String.valueOf(lu.getUserId()),
                "username", lu.getUsername(),
                "realName", lu.getRealName() == null ? "" : lu.getRealName(),
                "permissions", lu.getPermissions(),
                "admin", lu.isAdmin()
        );
    }

    public List<SysRole> listRoles() {
        return roleMapper.selectList(null);
    }
}
