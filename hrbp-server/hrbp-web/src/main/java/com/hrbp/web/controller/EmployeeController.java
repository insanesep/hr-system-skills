package com.hrbp.web.controller;

import com.hrbp.common.core.PageResult;
import com.hrbp.common.core.Result;
import com.hrbp.common.security.RequirePerm;
import com.hrbp.domain.employee.entity.EmpEmployee;
import com.hrbp.service.employee.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/employee")
@RequiredArgsConstructor
public class EmployeeController {
    private final EmployeeService employeeService;

    @GetMapping("/page")
    public Result<PageResult<EmpEmployee>> page(@RequestParam(required = false) String keyword,
                                                @RequestParam(required = false) Long deptId,
                                                @RequestParam(required = false) String empStatus,
                                                @RequestParam(required = false) String hireDateStart,
                                                @RequestParam(required = false) String hireDateEnd,
                                                @RequestParam(defaultValue = "1") long pageNum,
                                                @RequestParam(defaultValue = "10") long pageSize) {
        return Result.ok(employeeService.page(keyword, deptId, empStatus, hireDateStart, hireDateEnd, pageNum, pageSize));
    }

    @GetMapping("/{id}")
    @RequirePerm("BTN:HR_EMPLOYEE:DETAIL")
    public Result<Map<String, Object>> detail(@PathVariable Long id) {
        return Result.ok(employeeService.detail(id));
    }

    @GetMapping("/all")
    public Result<List<EmpEmployee>> all() {
        return Result.ok(employeeService.listAll());
    }
}
