package com.hrbp.web.controller;

import com.hrbp.common.core.Result;
import com.hrbp.service.workbench.WorkbenchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/workbench")
@RequiredArgsConstructor
public class WorkbenchController {
    private final WorkbenchService workbenchService;

    @GetMapping
    public Result<Map<String, Object>> all() {
        Map<String, Object> m = new HashMap<>();
        m.put("todos", workbenchService.todos());
        m.put("alerts", workbenchService.alerts());
        m.put("overview", workbenchService.overview());
        return Result.ok(m);
    }
}
