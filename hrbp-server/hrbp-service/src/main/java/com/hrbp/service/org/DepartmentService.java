package com.hrbp.service.org;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrbp.common.core.BizException;
import com.hrbp.domain.org.entity.OrgDepartment;
import com.hrbp.domain.org.mapper.OrgDepartmentMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DepartmentService {
    private final OrgDepartmentMapper deptMapper;

    /** 全量组织树（含停用），搜索时返回匹配节点及其祖先 */
    public List<Map<String, Object>> tree(String keyword) {
        List<OrgDepartment> all = deptMapper.selectList(new LambdaQueryWrapper<OrgDepartment>().orderByAsc(OrgDepartment::getSort));
        Map<Long, List<OrgDepartment>> byParent = all.stream().collect(Collectors.groupingBy(d -> d.getParentId() == null ? 0L : d.getParentId()));
        if (keyword != null && !keyword.isBlank()) {
            List<OrgDepartment> matched = all.stream()
                    .filter(d -> d.getDeptName().contains(keyword) || (d.getDeptCode() != null && d.getDeptCode().contains(keyword)))
                    .toList();
            java.util.Set<Long> keep = new java.util.HashSet<>();
            Map<Long, OrgDepartment> byId = all.stream().collect(Collectors.toMap(OrgDepartment::getId, d -> d));
            for (OrgDepartment m : matched) {
                OrgDepartment cur = m;
                while (cur != null && keep.add(cur.getId())) {
                    cur = byId.get(cur.getParentId());
                }
            }
            byParent = all.stream().filter(d -> keep.contains(d.getId()))
                    .collect(Collectors.groupingBy(d -> d.getParentId() == null ? 0L : d.getParentId()));
        }
        return buildTree(0L, byParent);
    }

    private List<Map<String, Object>> buildTree(Long parentId, Map<Long, List<OrgDepartment>> byParent) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (OrgDepartment d : byParent.getOrDefault(parentId, List.of())) {
            Map<String, Object> node = new java.util.LinkedHashMap<>();
            node.put("id", String.valueOf(d.getId()));
            node.put("parentId", String.valueOf(d.getParentId()));
            node.put("deptName", d.getDeptName());
            node.put("deptCode", d.getDeptCode());
            node.put("levelType", d.getLevelType());
            node.put("leaderId", d.getLeaderId() == null ? null : String.valueOf(d.getLeaderId()));
            node.put("quota", d.getQuota());
            node.put("sort", d.getSort());
            node.put("status", d.getStatus());
            node.put("foundDate", d.getFoundDate());
            node.put("revokeDate", d.getRevokeDate());
            node.put("remark", d.getRemark());
            node.put("children", buildTree(d.getId(), byParent));
            result.add(node);
        }
        return result;
    }

    @Transactional
    public OrgDepartment create(OrgDepartment dept) {
        validateNameUnique(dept, null);
        validateCodeUnique(dept.getDeptCode(), null);
        OrgDepartment parent = dept.getParentId() == null || dept.getParentId() == 0
                ? null : deptMapper.selectById(dept.getParentId());
        if (dept.getParentId() != null && dept.getParentId() != 0 && parent == null) {
            throw new BizException("上级部门不存在");
        }
        int depth = parent == null ? 0 : pathDepth(parent.getDeptPath());
        if (depth > 4) {
            throw new BizException("组织层级最多五级");
        }
        dept.setLevelType(levelTypeOf(depth));
        dept.setStatus(1);
        deptMapper.insert(dept);
        String path = parent == null ? "/" + dept.getId() + "/" : parent.getDeptPath() + dept.getId() + "/";
        dept.setDeptPath(path);
        deptMapper.updateById(dept);
        return dept;
    }

    @Transactional
    public void update(OrgDepartment dept) {
        OrgDepartment db = deptMapper.selectById(dept.getId());
        if (db == null) throw new BizException("部门不存在");
        if (db.getParentId() == 0) throw new BizException("根公司不可编辑");
        validateNameUnique(dept, dept.getId());
        if (dept.getDeptCode() != null && !dept.getDeptCode().equals(db.getDeptCode())) {
            validateCodeUnique(dept.getDeptCode(), dept.getId());
        }
        deptMapper.updateById(dept);
    }

    @Transactional
    public void delete(Long id) {
        OrgDepartment db = deptMapper.selectById(id);
        if (db == null) throw new BizException("部门不存在");
        if (db.getParentId() == 0) throw new BizException("根公司不可删除");
        long children = deptMapper.selectCount(new LambdaQueryWrapper<OrgDepartment>().eq(OrgDepartment::getParentId, id));
        if (children > 0) throw new BizException("存在下级部门，不可删除");
        // TODO: 在职员工校验（员工资料模块接入后启用）
        deptMapper.deleteById(id);
    }

    @Transactional
    public void toggleStatus(Long id, Integer status) {
        OrgDepartment db = deptMapper.selectById(id);
        if (db == null) throw new BizException("部门不存在");
        if (db.getParentId() == 0) throw new BizException("根公司恒启用");
        if (status == 0) {
            long activeChildren = deptMapper.selectCount(new LambdaQueryWrapper<OrgDepartment>()
                    .eq(OrgDepartment::getParentId, id).eq(OrgDepartment::getStatus, 1));
            if (activeChildren > 0) throw new BizException("存在启用的下级部门，不可停用");
        }
        db.setStatus(status);
        deptMapper.updateById(db);
    }

    private void validateNameUnique(OrgDepartment dept, Long excludeId) {
        LambdaQueryWrapper<OrgDepartment> qw = new LambdaQueryWrapper<OrgDepartment>()
                .eq(OrgDepartment::getParentId, dept.getParentId() == null ? 0 : dept.getParentId())
                .eq(OrgDepartment::getDeptName, dept.getDeptName());
        if (excludeId != null) qw.ne(OrgDepartment::getId, excludeId);
        if (deptMapper.selectCount(qw) > 0) throw new BizException("同级下部门名称已存在");
    }

    private void validateCodeUnique(String code, Long excludeId) {
        LambdaQueryWrapper<OrgDepartment> qw = new LambdaQueryWrapper<OrgDepartment>().eq(OrgDepartment::getDeptCode, code);
        if (excludeId != null) qw.ne(OrgDepartment::getId, excludeId);
        if (deptMapper.selectCount(qw) > 0) throw new BizException("部门编码已存在");
    }

    private int pathDepth(String path) {
        if (path == null || path.isBlank()) return 0;
        return (int) path.chars().filter(c -> c == '/').count() - 1;
    }

    private String levelTypeOf(int depth) {
        return switch (depth) {
            case 0 -> "公司";
            case 1 -> "中心";
            case 2 -> "部门";
            case 3 -> "小组";
            default -> "子小组";
        };
    }
}
