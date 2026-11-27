package com.hrbp.web.controller;

import com.hrbp.common.core.PageResult;
import com.hrbp.common.core.Result;
import com.hrbp.domain.perf.entity.*;
import com.hrbp.service.perf.PerformanceService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/perf")
@RequiredArgsConstructor
public class PerformanceController {
    private final PerformanceService perfService;

    @GetMapping("/periods")
    public Result<List<PerfPeriod>> periods() {
        return Result.ok(perfService.listPeriods());
    }

    @PostMapping("/periods/{id}/stage/{stage}")
    public Result<Void> stage(@PathVariable Long id, @PathVariable String stage) {
        perfService.advanceStage(id, stage);
        return Result.ok();
    }

    @GetMapping("/targets")
    public Result<List<PerfTarget>> targets(@RequestParam Long periodId, @RequestParam(required = false) Long empId) {
        return Result.ok(perfService.listTargets(periodId, empId));
    }

    @PostMapping("/targets/save")
    public Result<Void> saveTargets(@RequestBody SaveTargetsReq req) {
        perfService.saveTargets(req.getPeriodId(), req.getEmpId(), req.getEmpName(), req.getTargets());
        return Result.ok();
    }

    @PostMapping("/targets/submit")
    public Result<Void> submitTargets(@RequestBody Map<String, Long> body) {
        perfService.submitTargets(body.get("periodId"), body.get("empId"));
        return Result.ok();
    }

    @PostMapping("/targets/confirm")
    public Result<Void> confirmTargets(@RequestBody ConfirmReq req) {
        perfService.confirmTargets(req.getPeriodId(), req.getEmpId(), req.isConfirm(), req.getReason());
        return Result.ok();
    }

    @GetMapping("/reviews")
    public Result<PageResult<PerfReview>> reviews(@RequestParam(required = false) Long periodId,
                                                  @RequestParam(required = false) String status,
                                                  @RequestParam(required = false) String keyword,
                                                  @RequestParam(defaultValue = "1") long pageNum,
                                                  @RequestParam(defaultValue = "10") long pageSize) {
        return Result.ok(perfService.reviewPage(periodId, status, keyword, pageNum, pageSize));
    }

    @GetMapping("/reviews/{id}/items")
    public Result<List<PerfReviewItem>> items(@PathVariable Long id) {
        return Result.ok(perfService.reviewItems(id));
    }

    @PostMapping("/reviews/{id}/self")
    public Result<Void> self(@PathVariable Long id, @RequestBody List<PerfReviewItem> items) {
        perfService.submitSelf(id, items);
        return Result.ok();
    }

    @PostMapping("/reviews/{id}/manager")
    public Result<Void> manager(@PathVariable Long id, @RequestBody List<PerfReviewItem> items) {
        perfService.submitManager(id, items);
        return Result.ok();
    }

    @PostMapping("/reviews/{id}/calibrate")
    public Result<Void> calibrate(@PathVariable Long id, @RequestBody CalibrateReq req) {
        perfService.calibrate(id, req.getFinalGrade(), req.getFollowPlan(), req.getNonBReason());
        return Result.ok();
    }

    @GetMapping("/grade-configs")
    public Result<List<PerfGradeConfig>> gradeConfigs() {
        return Result.ok(perfService.gradeConfigs());
    }

    @PostMapping("/grade-configs")
    public Result<Void> saveGradeConfig(@RequestBody PerfGradeConfig c) {
        perfService.saveGradeConfig(c);
        return Result.ok();
    }

    @Data
    public static class SaveTargetsReq {
        private Long periodId;
        private Long empId;
        private String empName;
        private List<PerfTarget> targets;
    }

    @Data
    public static class ConfirmReq {
        private Long periodId;
        private Long empId;
        private boolean confirm;
        private String reason;
    }

    @Data
    public static class CalibrateReq {
        private String finalGrade;
        private String followPlan;
        private String nonBReason;
    }
}
