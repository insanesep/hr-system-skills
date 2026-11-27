package com.hrbp.web.controller;

import com.hrbp.common.core.Result;
import com.hrbp.common.security.RequirePerm;
import com.hrbp.domain.org.entity.OrgDepartment;
import com.hrbp.service.org.DepartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/org/department")
@RequiredArgsConstructor
public class DepartmentController {
    private final DepartmentService departmentService;

    @GetMapping("/tree")
    public Result<List<Map<String, Object>>> tree(@RequestParam(required = false) String keyword) {
        return Result.ok(departmentService.tree(keyword));
    }

    @PostMapping
    @RequirePerm("BTN:HR_DEPARTMENT:CREATE")
    public Result<OrgDepartment> create(@RequestBody OrgDepartment dept) {
        return Result.ok(departmentService.create(dept));
    }

    @PutMapping
    @RequirePerm("BTN:HR_DEPARTMENT:EDIT")
    public Result<Void> update(@RequestBody OrgDepartment dept) {
        departmentService.update(dept);
        return Result.ok();
    }

    @DeleteMapping("/{id}")
    @RequirePerm("BTN:HR_DEPARTMENT:DELETE")
    public Result<Void> delete(@PathVariable Long id) {
        departmentService.delete(id);
        return Result.ok();
    }

    @PostMapping("/{id}/status/{status}")
    @RequirePerm("BTN:HR_DEPARTMENT:STATUS")
    public Result<Void> status(@PathVariable Long id, @PathVariable Integer status) {
        departmentService.toggleStatus(id, status);
        return Result.ok();
    }
}
