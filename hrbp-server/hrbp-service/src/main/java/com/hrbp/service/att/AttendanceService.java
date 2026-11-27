package com.hrbp.service.att;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hrbp.common.core.BizException;
import com.hrbp.common.core.PageResult;
import com.hrbp.domain.att.entity.AttLeave;
import com.hrbp.domain.att.entity.AttMonth;
import com.hrbp.domain.att.entity.AttRecord;
import com.hrbp.domain.att.mapper.AttLeaveMapper;
import com.hrbp.domain.att.mapper.AttMonthMapper;
import com.hrbp.domain.att.mapper.AttRecordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttendanceService {
    private final AttRecordMapper recordMapper;
    private final AttLeaveMapper leaveMapper;
    private final AttMonthMapper monthMapper;

    public PageResult<AttRecord> recordPage(Long empId, String attDate, String dayStatus, long pageNum, long pageSize) {
        LambdaQueryWrapper<AttRecord> qw = new LambdaQueryWrapper<>();
        if (empId != null) qw.eq(AttRecord::getEmpId, empId);
        if (attDate != null && !attDate.isBlank()) qw.eq(AttRecord::getAttDate, attDate);
        if (dayStatus != null && !dayStatus.isBlank()) qw.eq(AttRecord::getDayStatus, dayStatus);
        qw.orderByDesc(AttRecord::getAttDate);
        return PageResult.of(recordMapper.selectPage(new Page<>(pageNum, pageSize), qw));
    }

    @Transactional
    public AttRecord punch(Long empId, String empName, LocalDate date, String checkIn, String checkOut) {
        AttRecord r = recordMapper.selectOne(new LambdaQueryWrapper<AttRecord>()
                .eq(AttRecord::getEmpId, empId).eq(AttRecord::getAttDate, date));
        if (r == null) {
            r = new AttRecord();
            r.setEmpId(empId);
            r.setEmpName(empName);
            r.setAttDate(date);
            r.setShiftName("标准班");
            r.setDataSource("手工补录");
        }
        if (checkIn != null && !checkIn.isBlank()) r.setCheckIn(java.time.LocalTime.parse(checkIn));
        if (checkOut != null && !checkOut.isBlank()) r.setCheckOut(java.time.LocalTime.parse(checkOut));
        // 状态判定：09:10 后迟到，18:00 前早退，缺卡
        String status = "正常";
        String ex = null;
        if (r.getCheckIn() == null || r.getCheckOut() == null) { status = "缺卡"; ex = "缺卡"; }
        else {
            if (r.getCheckIn().isAfter(java.time.LocalTime.of(9, 10))) { status = "迟到"; ex = "迟到"; }
            if (r.getCheckOut().isBefore(java.time.LocalTime.of(18, 0))) { status = "早退"; ex = "早退"; }
            if (r.getCheckOut().isAfter(java.time.LocalTime.of(19, 30))) { status = "加班"; ex = "加班"; }
        }
        r.setDayStatus(status);
        r.setExceptionType(ex);
        if (r.getId() == null) recordMapper.insert(r); else recordMapper.updateById(r);
        return r;
    }

    // ========== 假勤 ==========
    public PageResult<AttLeave> leavePage(Long empId, String leaveType, String approveStatus, long pageNum, long pageSize) {
        LambdaQueryWrapper<AttLeave> qw = new LambdaQueryWrapper<>();
        if (empId != null) qw.eq(AttLeave::getEmpId, empId);
        if (leaveType != null && !leaveType.isBlank()) qw.eq(AttLeave::getLeaveType, leaveType);
        if (approveStatus != null && !approveStatus.isBlank()) qw.eq(AttLeave::getApproveStatus, approveStatus);
        qw.orderByDesc(AttLeave::getCreateTime);
        return PageResult.of(leaveMapper.selectPage(new Page<>(pageNum, pageSize), qw));
    }

    @Transactional
    public AttLeave createLeave(AttLeave l) {
        // 同时段重复申请阻断
        long dup = leaveMapper.selectCount(new LambdaQueryWrapper<AttLeave>()
                .eq(AttLeave::getEmpId, l.getEmpId())
                .in(AttLeave::getApproveStatus, "待审批", "已通过")
                .le(AttLeave::getStartTime, l.getEndTime())
                .ge(AttLeave::getEndTime, l.getStartTime()));
        if (dup > 0) throw new BizException("该时段已有进行中的假勤申请");
        l.setLeaveNo("QJ-" + LocalDate.now().getYear() + "-" + String.format("%04d", System.currentTimeMillis() % 10000));
        l.setApproveStatus("待审批");
        leaveMapper.insert(l);
        return l;
    }

    /** 审批通过回写日考勤与月度汇总 */
    @Transactional
    public void approveLeave(Long id, boolean pass) {
        AttLeave l = leaveMapper.selectById(id);
        if (l == null) throw new BizException("申请不存在");
        if (!"待审批".equals(l.getApproveStatus())) throw new BizException("当前状态不可审批");
        l.setApproveStatus(pass ? "已通过" : "已驳回");
        leaveMapper.updateById(l);
        if (!pass) return;
        // 回写日考勤
        LocalDate day = l.getStartTime().toLocalDate();
        String dayStatus = switch (l.getLeaveType()) {
            case "请假" -> "请假";
            case "加班" -> "加班";
            case "出差" -> "出差";
            default -> "正常";
        };
        if (!"补卡".equals(l.getLeaveType())) {
            punch(l.getEmpId(), l.getEmpName(), day, null, null);
            AttRecord r = recordMapper.selectOne(new LambdaQueryWrapper<AttRecord>()
                    .eq(AttRecord::getEmpId, l.getEmpId()).eq(AttRecord::getAttDate, day));
            r.setDayStatus(dayStatus);
            r.setExceptionType(l.getLeaveType());
            recordMapper.updateById(r);
        }
        // 回写月度汇总
        String month = day.toString().substring(0, 7);
        AttMonth am = monthMapper.selectOne(new LambdaQueryWrapper<AttMonth>()
                .eq(AttMonth::getEmpId, l.getEmpId()).eq(AttMonth::getMonth, month));
        if (am != null && !"已锁定".equals(am.getStatus())) {
            if ("请假".equals(l.getLeaveType()) && l.getHours() != null) {
                am.setLeaveHours((am.getLeaveHours() == null ? java.math.BigDecimal.ZERO : am.getLeaveHours()).add(l.getHours()));
            }
            if ("加班".equals(l.getLeaveType()) && l.getHours() != null) {
                am.setOvertimeHours((am.getOvertimeHours() == null ? java.math.BigDecimal.ZERO : am.getOvertimeHours()).add(l.getHours()));
            }
            monthMapper.updateById(am);
        }
    }

    // ========== 月度 ==========
    public PageResult<AttMonth> monthPage(String month, String status, long pageNum, long pageSize) {
        LambdaQueryWrapper<AttMonth> qw = new LambdaQueryWrapper<>();
        if (month != null && !month.isBlank()) qw.eq(AttMonth::getMonth, month);
        if (status != null && !status.isBlank()) qw.eq(AttMonth::getStatus, status);
        qw.orderByDesc(AttMonth::getMonth);
        return PageResult.of(monthMapper.selectPage(new Page<>(pageNum, pageSize), qw));
    }

    @Transactional
    public void changeMonthStatus(Long id, String status) {
        AttMonth am = monthMapper.selectById(id);
        if (am == null) throw new BizException("汇总不存在");
        // 状态只前进
        List<String> order = List.of("待确认", "已确认", "已锁定");
        if (order.indexOf(status) <= order.indexOf(am.getStatus())) {
            throw new BizException("月度状态不可回退");
        }
        am.setStatus(status);
        monthMapper.updateById(am);
    }
}
