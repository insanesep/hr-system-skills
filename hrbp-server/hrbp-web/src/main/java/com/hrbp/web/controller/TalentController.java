package com.hrbp.web.controller;

import com.hrbp.common.core.PageResult;
import com.hrbp.common.core.Result;
import com.hrbp.domain.talent.entity.ReviewCycle;
import com.hrbp.domain.talent.entity.ReviewDetail;
import com.hrbp.domain.talent.entity.TalentRecord;
import com.hrbp.service.talent.TalentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/talent")
@RequiredArgsConstructor
public class TalentController {
    private final TalentService talentService;

    @GetMapping("/record/page")
    public Result<PageResult<TalentRecord>> recordPage(@RequestParam(required = false) Long empId,
                                                       @RequestParam(required = false) String recordType,
                                                       @RequestParam(defaultValue = "1") long pageNum,
                                                       @RequestParam(defaultValue = "10") long pageSize) {
        return Result.ok(talentService.recordPage(empId, recordType, pageNum, pageSize));
    }

    @GetMapping("/record/history/{recordNo}")
    public Result<List<TalentRecord>> history(@PathVariable String recordNo) {
        return Result.ok(talentService.recordHistory(recordNo));
    }

    @PostMapping("/record")
    public Result<TalentRecord> create(@RequestBody TalentRecord r) {
        return Result.ok(talentService.createRecord(r));
    }

    @PostMapping("/record/{id}/edit")
    public Result<TalentRecord> edit(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return Result.ok(talentService.editRecord(id, body.get("content"), body.get("editReason")));
    }

    @PostMapping("/record/{id}/revoke")
    public Result<Void> revoke(@PathVariable Long id, @RequestBody Map<String, String> body) {
        talentService.revokeRecord(id, body.get("reason"));
        return Result.ok();
    }

    // 九宫格
    @GetMapping("/review/cycles")
    public Result<List<ReviewCycle>> cycles() {
        return Result.ok(talentService.listCycles());
    }

    @GetMapping("/review/details")
    public Result<List<ReviewDetail>> details(@RequestParam Long cycleId) {
        return Result.ok(talentService.listDetails(cycleId));
    }

    @PostMapping("/review/details")
    public Result<Void> saveDetail(@RequestBody ReviewDetail d) {
        talentService.saveDetail(d);
        return Result.ok();
    }

    @GetMapping("/review/nine-box")
    public Result<List<Map<String, Object>>> nineBox(@RequestParam Long cycleId) {
        return Result.ok(talentService.nineBox(cycleId));
    }

    @PostMapping("/review/cycles/{id}/lock/{lock}")
    public Result<Void> lock(@PathVariable Long id, @PathVariable boolean lock) {
        talentService.lockCycle(id, lock);
        return Result.ok();
    }
}
