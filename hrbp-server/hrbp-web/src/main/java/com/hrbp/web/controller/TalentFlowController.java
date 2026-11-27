package com.hrbp.web.controller;

import com.hrbp.common.core.PageResult;
import com.hrbp.common.core.Result;
import com.hrbp.domain.flow.entity.*;
import com.hrbp.service.flow.GrowthEventService;
import com.hrbp.service.flow.TalentFlowService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/flow")
@RequiredArgsConstructor
public class TalentFlowController {
    private final TalentFlowService flowService;
    private final GrowthEventService growthService;

    // ===== 入职 =====
    @GetMapping("/onboarding/page")
    public Result<PageResult<ObOnboarding>> onboardingPage(@RequestParam(required = false) String docStatus,
                                                           @RequestParam(required = false) String keyword,
                                                           @RequestParam(defaultValue = "1") long pageNum,
                                                           @RequestParam(defaultValue = "10") long pageSize) {
        return Result.ok(flowService.onboardingPage(docStatus, keyword, pageNum, pageSize));
    }

    @PostMapping("/onboarding")
    public Result<ObOnboarding> createOnboarding(@RequestBody ObOnboarding ob) {
        return Result.ok(flowService.createOnboarding(ob));
    }

    @PostMapping("/onboarding/{id}/confirm")
    public Result<Void> confirmOnboarding(@PathVariable Long id) {
        flowService.confirmOnboarding(id);
        return Result.ok();
    }

    @PostMapping("/onboarding/{id}/absent")
    public Result<Void> absentOnboarding(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        flowService.absentOnboarding(id, body == null ? null : body.get("reason"));
        return Result.ok();
    }

    // ===== 转正 =====
    @GetMapping("/regularization/page")
    public Result<PageResult<RegRegularization>> regPage(@RequestParam(required = false) String docStatus,
                                                         @RequestParam(required = false) String keyword,
                                                         @RequestParam(defaultValue = "1") long pageNum,
                                                         @RequestParam(defaultValue = "10") long pageSize) {
        return Result.ok(flowService.regPage(docStatus, keyword, pageNum, pageSize));
    }

    @PostMapping("/regularization/{id}/eval")
    public Result<Void> regEval(@PathVariable Long id, @RequestBody EvalReq req) {
        flowService.submitRegEval(id, req.getScore(), req.getConclusion());
        return Result.ok();
    }

    @PostMapping("/regularization/{id}/approve")
    public Result<Void> regApprove(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        flowService.approveReg(id, Boolean.TRUE.equals(body.get("pass")));
        return Result.ok();
    }

    // ===== 异动 =====
    @GetMapping("/movement/page")
    public Result<PageResult<MvMovement>> movementPage(@RequestParam(required = false) String docStatus,
                                                       @RequestParam(defaultValue = "1") long pageNum,
                                                       @RequestParam(defaultValue = "10") long pageSize) {
        return Result.ok(flowService.movementPage(docStatus, pageNum, pageSize));
    }

    @PostMapping("/movement")
    public Result<MvMovement> createMovement(@RequestBody MvMovement mv) {
        return Result.ok(flowService.createMovement(mv));
    }

    @PostMapping("/movement/{id}/submit")
    public Result<Void> submitMovement(@PathVariable Long id) {
        flowService.submitMovement(id);
        return Result.ok();
    }

    @PostMapping("/movement/{id}/approve")
    public Result<Void> approveMovement(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        flowService.approveMovement(id, Boolean.TRUE.equals(body.get("pass")));
        return Result.ok();
    }

    @PostMapping("/movement/apply-due")
    public Result<Integer> applyDueMovements() {
        return Result.ok(flowService.applyDueMovements());
    }

    // ===== 离职 =====
    @GetMapping("/offboarding/page")
    public Result<PageResult<OffOffboarding>> offboardingPage(@RequestParam(required = false) String docStatus,
                                                              @RequestParam(defaultValue = "1") long pageNum,
                                                              @RequestParam(defaultValue = "10") long pageSize) {
        return Result.ok(flowService.offboardingPage(docStatus, pageNum, pageSize));
    }

    @PostMapping("/offboarding")
    public Result<OffOffboarding> createOffboarding(@RequestBody OffOffboarding off) {
        return Result.ok(flowService.createOffboarding(off));
    }

    @PostMapping("/offboarding/{id}/submit")
    public Result<Void> submitOff(@PathVariable Long id) {
        flowService.submitOffboarding(id);
        return Result.ok();
    }

    @PostMapping("/offboarding/{id}/approve")
    public Result<Void> approveOff(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        flowService.approveOffboarding(id, Boolean.TRUE.equals(body.get("pass")));
        return Result.ok();
    }

    @PostMapping("/offboarding/{id}/handover")
    public Result<Void> handover(@PathVariable Long id, @RequestBody Map<String, String> body) {
        flowService.updateHandover(id, body.get("handoverStatus"));
        return Result.ok();
    }

    @PostMapping("/offboarding/{id}/confirm")
    public Result<Void> confirmOff(@PathVariable Long id) {
        flowService.confirmOffboarding(id);
        return Result.ok();
    }

    // ===== 合同 =====
    @GetMapping("/contract/page")
    public Result<PageResult<CtrContract>> contractPage(@RequestParam(required = false) String status,
                                                        @RequestParam(required = false) String keyword,
                                                        @RequestParam(defaultValue = "1") long pageNum,
                                                        @RequestParam(defaultValue = "10") long pageSize) {
        return Result.ok(flowService.contractPage(status, keyword, pageNum, pageSize));
    }

    @PostMapping("/contract/{id}/sign")
    public Result<Void> sign(@PathVariable Long id) {
        flowService.signContract(id);
        return Result.ok();
    }

    @PostMapping("/contract/{id}/renew")
    public Result<CtrContract> renew(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return Result.ok(flowService.renewContract(id, LocalDate.parse(body.get("newEndDate"))));
    }

    @PostMapping("/contract/{id}/release")
    public Result<Void> release(@PathVariable Long id, @RequestBody Map<String, String> body) {
        flowService.releaseContract(id, body.get("reason"));
        return Result.ok();
    }

    @PostMapping("/contract/expire-due")
    public Result<Integer> expireDue() {
        return Result.ok(flowService.expireDueContracts());
    }

    // ===== 成长记录 =====
    @GetMapping("/growth/page")
    public Result<PageResult<GrowthEvent>> growthPage(@RequestParam(required = false) Long empId,
                                                      @RequestParam(required = false) String eventType,
                                                      @RequestParam(required = false) String keyword,
                                                      @RequestParam(defaultValue = "1") long pageNum,
                                                      @RequestParam(defaultValue = "20") long pageSize) {
        return Result.ok(growthService.page(empId, eventType, keyword, pageNum, pageSize));
    }

    @GetMapping("/growth/timeline/{empId}")
    public Result<List<GrowthEvent>> timeline(@PathVariable Long empId) {
        return Result.ok(growthService.timeline(empId));
    }

    @Data
    public static class EvalReq {
        private BigDecimal score;
        private String conclusion;
    }
}
