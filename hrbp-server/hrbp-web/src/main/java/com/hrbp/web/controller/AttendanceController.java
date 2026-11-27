package com.hrbp.web.controller;

import com.hrbp.common.core.PageResult;
import com.hrbp.common.core.Result;
import com.hrbp.domain.att.entity.AttLeave;
import com.hrbp.domain.att.entity.AttMonth;
import com.hrbp.domain.att.entity.AttRecord;
import com.hrbp.service.att.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/att")
@RequiredArgsConstructor
public class AttendanceController {
    private final AttendanceService attService;

    @GetMapping("/record/page")
    public Result<PageResult<AttRecord>> recordPage(@RequestParam(required = false) Long empId,
                                                    @RequestParam(required = false) String attDate,
                                                    @RequestParam(required = false) String dayStatus,
                                                    @RequestParam(defaultValue = "1") long pageNum,
                                                    @RequestParam(defaultValue = "10") long pageSize) {
        return Result.ok(attService.recordPage(empId, attDate, dayStatus, pageNum, pageSize));
    }

    @PostMapping("/record/punch")
    public Result<AttRecord> punch(@RequestBody Map<String, String> body) {
        return Result.ok(attService.punch(Long.valueOf(body.get("empId")), body.get("empName"),
                LocalDate.parse(body.get("attDate")), body.get("checkIn"), body.get("checkOut")));
    }

    @GetMapping("/leave/page")
    public Result<PageResult<AttLeave>> leavePage(@RequestParam(required = false) Long empId,
                                                  @RequestParam(required = false) String leaveType,
                                                  @RequestParam(required = false) String approveStatus,
                                                  @RequestParam(defaultValue = "1") long pageNum,
                                                  @RequestParam(defaultValue = "10") long pageSize) {
        return Result.ok(attService.leavePage(empId, leaveType, approveStatus, pageNum, pageSize));
    }

    @PostMapping("/leave")
    public Result<AttLeave> createLeave(@RequestBody AttLeave l) {
        return Result.ok(attService.createLeave(l));
    }

    @PostMapping("/leave/{id}/approve")
    public Result<Void> approveLeave(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        attService.approveLeave(id, Boolean.TRUE.equals(body.get("pass")));
        return Result.ok();
    }

    @GetMapping("/month/page")
    public Result<PageResult<AttMonth>> monthPage(@RequestParam(required = false) String month,
                                                  @RequestParam(required = false) String status,
                                                  @RequestParam(defaultValue = "1") long pageNum,
                                                  @RequestParam(defaultValue = "10") long pageSize) {
        return Result.ok(attService.monthPage(month, status, pageNum, pageSize));
    }

    @PostMapping("/month/{id}/status/{status}")
    public Result<Void> monthStatus(@PathVariable Long id, @PathVariable String status) {
        attService.changeMonthStatus(id, status);
        return Result.ok();
    }
}
