package com.hrbp.web.controller;

import com.hrbp.common.core.PageResult;
import com.hrbp.common.core.Result;
import com.hrbp.common.security.RequirePerm;
import com.hrbp.domain.est.entity.EstChangeLog;
import com.hrbp.domain.est.entity.EstIncumbent;
import com.hrbp.domain.est.entity.EstLine;
import com.hrbp.domain.est.entity.EstPlan;
import com.hrbp.service.est.EstablishmentService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/est")
@RequiredArgsConstructor
public class EstablishmentController {
    private final EstablishmentService estService;

    @GetMapping("/page")
    public Result<PageResult<Map<String, Object>>> page(@RequestParam(required = false) String keyword,
                                                        @RequestParam(required = false) String estStatus,
                                                        @RequestParam(required = false) String empType,
                                                        @RequestParam(required = false) String estPlanType,
                                                        @RequestParam(required = false) Long deptId,
                                                        @RequestParam(defaultValue = "1") long pageNum,
                                                        @RequestParam(defaultValue = "10") long pageSize) {
        return Result.ok(estService.page(keyword, estStatus, empType, estPlanType, deptId, pageNum, pageSize));
    }

    @GetMapping("/stats")
    public Result<Map<String, Object>> stats(@RequestParam(required = false) Long deptId) {
        return Result.ok(estService.stats(deptId));
    }

    @PostMapping
    @RequirePerm("BTN:HR_ESTABLISHMENT:CREATE")
    public Result<EstLine> create(@RequestBody EstLine line) {
        return Result.ok(estService.create(line));
    }

    @PostMapping("/{id}/adjust")
    @RequirePerm("BTN:HR_ESTABLISHMENT:ADJUST")
    public Result<Void> adjust(@PathVariable Long id, @RequestBody AdjustReq req) {
        estService.adjust(id, req.getNewQuota(), req.getReason(), req.getAdjustType());
        return Result.ok();
    }

    @PostMapping("/{id}/approve")
    @RequirePerm("BTN:HR_ESTABLISHMENT:APPROVE")
    public Result<Void> approve(@PathVariable Long id, @RequestBody ApproveReq req) {
        estService.approve(id, req.isPass(), req.getReason());
        return Result.ok();
    }

    @PostMapping("/{id}/status")
    @RequirePerm("BTN:HR_ESTABLISHMENT:STATUS")
    public Result<Void> status(@PathVariable Long id, @RequestBody StatusReq req) {
        estService.toggleStatus(id, req.isEnable(), req.getReason());
        return Result.ok();
    }

    @GetMapping("/outsource-over")
    public Result<List<Map<String, Object>>> outsourceOver() {
        return Result.ok(estService.outsourceOver());
    }

    @GetMapping("/{id}/incumbents")
    public Result<List<EstIncumbent>> incumbents(@PathVariable Long id) {
        return Result.ok(estService.incumbents(id));
    }

    @PostMapping("/incumbents/{incumbentId}/confirm")
    @RequirePerm("BTN:HR_ESTABLISHMENT:CONFIRM")
    public Result<Void> confirmIncumbent(@PathVariable Long incumbentId, @RequestBody(required = false) Map<String, String> body) {
        estService.confirmIncumbent(incumbentId, body == null ? null : body.get("overRemark"));
        return Result.ok();
    }

    @GetMapping("/{id}/logs")
    public Result<List<EstChangeLog>> logs(@PathVariable Long id) {
        return Result.ok(estService.logs(id));
    }

    @GetMapping("/plans")
    public Result<List<Map<String, Object>>> plans(@RequestParam(required = false) Integer year) {
        return Result.ok(estService.plans(year));
    }

    @PostMapping("/plans")
    @RequirePerm("BTN:HR_ESTABLISHMENT:PLAN_EDIT")
    public Result<Void> savePlan(@RequestBody EstPlan plan) {
        estService.savePlan(plan);
        return Result.ok();
    }

    @Data
    public static class AdjustReq {
        private Integer newQuota;
        private String reason;
        private String adjustType;
    }

    @Data
    public static class ApproveReq {
        private boolean pass;
        private String reason;
    }

    @Data
    public static class StatusReq {
        private boolean enable;
        private String reason;
    }
}
