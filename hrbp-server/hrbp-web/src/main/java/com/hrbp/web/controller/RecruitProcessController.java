package com.hrbp.web.controller;

import com.hrbp.common.core.PageResult;
import com.hrbp.common.core.Result;
import com.hrbp.domain.recruit.entity.*;
import com.hrbp.service.recruit.RecruitProcessService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recruit/process")
@RequiredArgsConstructor
public class RecruitProcessController {
    private final RecruitProcessService processService;

    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.ok(processService.processStats());
    }

    // 职位
    @GetMapping("/jobs")
    public Result<List<RecruitJob>> jobs(@RequestParam(required = false) Long demandId,
                                         @RequestParam(required = false) String jobStatus) {
        return Result.ok(processService.listJobs(demandId, jobStatus));
    }

    @PostMapping("/jobs")
    public Result<RecruitJob> createJob(@RequestBody RecruitJob job) {
        return Result.ok(processService.createJob(job));
    }

    @PostMapping("/jobs/{id}/status/{status}")
    public Result<Void> jobStatus(@PathVariable Long id, @PathVariable String status) {
        processService.changeJobStatus(id, status);
        return Result.ok();
    }

    // 应聘者
    @GetMapping("/candidates")
    public Result<PageResult<RecruitCandidate>> candidates(@RequestParam(required = false) String keyword,
                                                           @RequestParam(defaultValue = "1") long pageNum,
                                                           @RequestParam(defaultValue = "10") long pageSize) {
        return Result.ok(processService.candidatePage(keyword, pageNum, pageSize));
    }

    @PostMapping("/candidates")
    public Result<RecruitCandidate> saveCandidate(@RequestBody RecruitCandidate c) {
        return Result.ok(processService.saveCandidate(c));
    }

    @PostMapping("/candidates/{id}/lock/{lock}")
    public Result<Void> lock(@PathVariable Long id, @PathVariable boolean lock) {
        processService.lockCandidate(id, lock);
        return Result.ok();
    }

    // 投递（台账）
    @GetMapping("/applications")
    public Result<PageResult<Map<String, Object>>> applications(@RequestParam(required = false) Long jobId,
                                                                @RequestParam(required = false) String applyStatus,
                                                                @RequestParam(required = false) String keyword,
                                                                @RequestParam(defaultValue = "1") long pageNum,
                                                                @RequestParam(defaultValue = "10") long pageSize) {
        return Result.ok(processService.applicationPage(jobId, applyStatus, keyword, pageNum, pageSize));
    }

    @PostMapping("/applications")
    public Result<RecruitApplication> apply(@RequestBody ApplyReq req) {
        return Result.ok(processService.apply(req.getJobId(), req.getCandidateId(), req.getEntrySource()));
    }

    @PostMapping("/applications/{id}/status")
    public Result<Void> applyStatus(@PathVariable Long id, @RequestBody ApplyStatusReq req) {
        processService.changeApplyStatus(id, req.getStatus(), req.getQuitReason());
        return Result.ok();
    }

    // 面试
    @GetMapping("/interviews")
    public Result<List<RecruitInterview>> interviews(@RequestParam(required = false) Long applicationId,
                                                     @RequestParam(required = false) String interviewer) {
        return Result.ok(processService.listInterviews(applicationId, interviewer));
    }

    @PostMapping("/interviews")
    public Result<RecruitInterview> createInterview(@RequestBody RecruitInterview iv) {
        return Result.ok(processService.createInterview(iv));
    }

    @PostMapping("/interviews/{id}/conclusion")
    public Result<Void> conclusion(@PathVariable Long id, @RequestBody ConclusionReq req) {
        processService.submitConclusion(id, req.getConclusion(), req.getComment());
        return Result.ok();
    }

    // Offer
    @GetMapping("/offers")
    public Result<PageResult<RecruitOffer>> offers(@RequestParam(required = false) String offerStatus,
                                                   @RequestParam(defaultValue = "1") long pageNum,
                                                   @RequestParam(defaultValue = "10") long pageSize) {
        return Result.ok(processService.offerPage(offerStatus, pageNum, pageSize));
    }

    @PostMapping("/offers")
    public Result<RecruitOffer> createOffer(@RequestBody RecruitOffer o) {
        return Result.ok(processService.createOffer(o));
    }

    @PostMapping("/offers/{id}/{action}")
    public Result<Void> offerAction(@PathVariable Long id, @PathVariable String action) {
        processService.changeOfferStatus(id, action);
        return Result.ok();
    }

    @Data
    public static class ApplyReq {
        private Long jobId;
        private Long candidateId;
        private String entrySource;
    }

    @Data
    public static class ApplyStatusReq {
        private String status;
        private String quitReason;
    }

    @Data
    public static class ConclusionReq {
        private String conclusion;
        private String comment;
    }
}
