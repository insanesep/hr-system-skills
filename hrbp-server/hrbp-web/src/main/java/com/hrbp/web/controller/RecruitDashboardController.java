package com.hrbp.web.controller;

import com.hrbp.common.core.Result;
import com.hrbp.service.recruit.RecruitDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/recruit/dashboard")
@RequiredArgsConstructor
public class RecruitDashboardController {
    private final RecruitDashboardService dashboardService;

    @GetMapping
    public Result<Map<String, Object>> all() {
        Map<String, Object> m = new HashMap<>();
        m.put("kpi", dashboardService.kpi());
        m.put("progress", dashboardService.progress());
        m.put("funnel", dashboardService.funnel());
        m.put("channel", dashboardService.channel());
        m.put("offer", dashboardService.offerAnalysis());
        m.put("efficiency", dashboardService.efficiency());
        return Result.ok(m);
    }
}
