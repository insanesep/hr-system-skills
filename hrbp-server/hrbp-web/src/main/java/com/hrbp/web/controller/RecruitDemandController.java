package com.hrbp.web.controller;

import com.hrbp.common.core.PageResult;
import com.hrbp.common.core.Result;
import com.hrbp.common.security.RequirePerm;
import com.hrbp.domain.recruit.entity.RecruitDemand;
import com.hrbp.service.recruit.RecruitDemandService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/recruit/demand")
@RequiredArgsConstructor
public class RecruitDemandController {
    private final RecruitDemandService demandService;

    @GetMapping("/page")
    public Result<PageResult<Map<String, Object>>> page(@RequestParam(required = false) String keyword,
                                                        @RequestParam(required = false) String demandStatus,
                                                        @RequestParam(required = false) String jobCategory,
                                                        @RequestParam(required = false) Boolean outsource,
                                                        @RequestParam(required = false) String quarter,
                                                        @RequestParam(defaultValue = "1") long pageNum,
                                                        @RequestParam(defaultValue = "10") long pageSize) {
        return Result.ok(demandService.page(keyword, demandStatus, jobCategory, outsource, quarter, pageNum, pageSize));
    }

    @GetMapping("/stats")
    public Result<Map<String, Object>> stats(@RequestParam(required = false) Boolean outsource) {
        return Result.ok(demandService.stats(outsource));
    }

    @GetMapping("/{id}")
    public Result<Map<String, Object>> detail(@PathVariable Long id) {
        return Result.ok(demandService.detail(id));
    }

    @PostMapping
    @RequirePerm("BTN:HR_RECRUIT_DEMAND:CREATE")
    public Result<RecruitDemand> create(@RequestBody RecruitDemand demand) {
        return Result.ok(demandService.create(demand));
    }

    @PutMapping
    @RequirePerm("BTN:HR_RECRUIT_DEMAND:EDIT")
    public Result<Void> update(@RequestBody RecruitDemand demand) {
        demandService.update(demand);
        return Result.ok();
    }

    @PostMapping("/{id}/submit")
    public Result<Void> submit(@PathVariable Long id) {
        demandService.submit(id);
        return Result.ok();
    }

    @PostMapping("/{id}/approve")
    @RequirePerm("BTN:HR_RECRUIT_DEMAND:APPROVE")
    public Result<Void> approve(@PathVariable Long id, @RequestBody ApproveReq req) {
        demandService.approve(id, req.isPass(), req.getReason());
        return Result.ok();
    }

    @PostMapping("/{id}/close")
    @RequirePerm("BTN:HR_RECRUIT_DEMAND:CLOSE")
    public Result<Void> close(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        demandService.close(id, body == null ? null : body.get("reason"));
        return Result.ok();
    }

    @PostMapping("/{id}/grant")
    @RequirePerm("BTN:HR_RECRUIT_DEMAND:GRANT")
    public Result<Void> grant(@PathVariable Long id, @RequestBody Map<String, String> body) {
        demandService.grant(id, body.get("granteeName"));
        return Result.ok();
    }

    @PostMapping("/grant/{grantId}/revoke")
    @RequirePerm("BTN:HR_RECRUIT_DEMAND:GRANT")
    public Result<Void> revokeGrant(@PathVariable Long grantId) {
        demandService.revokeGrant(grantId);
        return Result.ok();
    }

    @Data
    public static class ApproveReq {
        private boolean pass;
        private String reason;
    }
}
