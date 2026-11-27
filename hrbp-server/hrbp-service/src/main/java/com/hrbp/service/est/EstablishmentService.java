package com.hrbp.service.est;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hrbp.common.core.BizException;
import com.hrbp.common.core.PageResult;
import com.hrbp.common.security.UserContext;
import com.hrbp.domain.est.entity.EstChangeLog;
import com.hrbp.domain.est.entity.EstIncumbent;
import com.hrbp.domain.est.entity.EstLine;
import com.hrbp.domain.est.entity.EstPlan;
import com.hrbp.domain.est.mapper.EstChangeLogMapper;
import com.hrbp.domain.est.mapper.EstIncumbentMapper;
import com.hrbp.domain.est.mapper.EstLineMapper;
import com.hrbp.domain.est.mapper.EstPlanMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class EstablishmentService {
    private final EstLineMapper lineMapper;
    private final EstIncumbentMapper incumbentMapper;
    private final EstChangeLogMapper changeLogMapper;
    private final EstPlanMapper planMapper;

    /** 可用缺额 = 编制数量 − 在编人数 − 招聘占用（可为负=超编） */
    public int vacancy(EstLine line) {
        return (line.getQuota() == null ? 0 : line.getQuota())
                - (line.getIncumbent() == null ? 0 : line.getIncumbent())
                - (line.getRecruitHold() == null ? 0 : line.getRecruitHold());
    }

    public PageResult<Map<String, Object>> page(String keyword, String estStatus, String empType, String estPlanType,
                                                Long deptId, long pageNum, long pageSize) {
        LambdaQueryWrapper<EstLine> qw = buildQuery(keyword, estStatus, empType, estPlanType, deptId);
        qw.orderByDesc(EstLine::getCreateTime);
        Page<EstLine> page = lineMapper.selectPage(new Page<>(pageNum, pageSize), qw);
        PageResult<EstLine> raw = PageResult.of(page);
        PageResult<Map<String, Object>> result = new PageResult<>();
        result.setTotal(raw.getTotal());
        result.setPageNum(raw.getPageNum());
        result.setPageSize(raw.getPageSize());
        result.setList(raw.getList().stream().map(this::toView).toList());
        return result;
    }

    private LambdaQueryWrapper<EstLine> buildQuery(String keyword, String estStatus, String empType, String estPlanType, Long deptId) {
        LambdaQueryWrapper<EstLine> qw = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            qw.and(w -> w.like(EstLine::getEstNo, keyword)
                    .or().like(EstLine::getPositionName, keyword)
                    .or().like(EstLine::getDeptLv3, keyword));
        }
        if (estStatus != null && !estStatus.isBlank()) qw.eq(EstLine::getEstStatus, estStatus);
        if (empType != null && !empType.isBlank()) qw.eq(EstLine::getEmpType, empType);
        if (estPlanType != null && !estPlanType.isBlank()) qw.eq(EstLine::getEstPlanType, estPlanType);
        if (deptId != null) qw.eq(EstLine::getDeptId, deptId);
        return qw;
    }

    private Map<String, Object> toView(EstLine line) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", String.valueOf(line.getId()));
        m.put("estNo", line.getEstNo());
        m.put("estPlanType", line.getEstPlanType());
        m.put("year", line.getYear());
        m.put("startDate", line.getStartDate());
        m.put("endDate", line.getEndDate());
        m.put("quota", line.getQuota());
        m.put("deptPath", buildDeptPath(line));
        m.put("deptLv1", line.getDeptLv1());
        m.put("deptLv2", line.getDeptLv2());
        m.put("deptLv3", line.getDeptLv3());
        m.put("deptId", String.valueOf(line.getDeptId()));
        m.put("positionId", line.getPositionId() == null ? null : String.valueOf(line.getPositionId()));
        m.put("positionName", line.getPositionName());
        m.put("directLeader", line.getDirectLeader());
        m.put("jobLevel", line.getJobLevel());
        m.put("levelCategory", line.getLevelCategory());
        m.put("empType", line.getEmpType());
        m.put("incumbent", line.getIncumbent());
        m.put("recruitHold", line.getRecruitHold());
        m.put("vacancy", vacancy(line));
        m.put("estStatus", line.getEstStatus());
        m.put("source", line.getSource());
        m.put("remark", line.getRemark());
        return m;
    }

    private String buildDeptPath(EstLine line) {
        return java.util.stream.Stream.of(line.getDeptLv1(), line.getDeptLv2(), line.getDeptLv3(), line.getDeptLv4(), line.getDeptLv5())
                .filter(s -> s != null && !s.isBlank())
                .reduce((a, b) -> a + " / " + b).orElse("");
    }

    /** 统计卡：生效中口径 */
    public Map<String, Object> stats(Long deptId) {
        List<EstLine> active = lineMapper.selectList(new LambdaQueryWrapper<EstLine>()
                .eq(EstLine::getEstStatus, "生效中")
                .eq(deptId != null, EstLine::getDeptId, deptId));
        AtomicInteger quota = new AtomicInteger(), incumbent = new AtomicInteger(), hold = new AtomicInteger();
        active.forEach(l -> {
            quota.addAndGet(l.getQuota() == null ? 0 : l.getQuota());
            incumbent.addAndGet(l.getIncumbent() == null ? 0 : l.getIncumbent());
            hold.addAndGet(l.getRecruitHold() == null ? 0 : l.getRecruitHold());
        });
        long overCount = active.stream().filter(l -> vacancy(l) < 0).count();
        long pending = lineMapper.selectCount(new LambdaQueryWrapper<EstLine>().eq(EstLine::getEstStatus, "待审批"));
        Map<String, Object> m = new HashMap<>();
        m.put("quotaTotal", quota.get());
        m.put("incumbentTotal", incumbent.get());
        m.put("recruitHoldTotal", hold.get());
        m.put("vacancyTotal", quota.get() - incumbent.get() - hold.get());
        m.put("overLines", overCount);
        m.put("pendingApproval", pending);
        return m;
    }

    @Transactional
    public EstLine create(EstLine line) {
        line.setEstNo(nextEstNo(line.getYear() == null ? java.time.LocalDate.now().getYear() : line.getYear()));
        line.setIncumbent(0);
        line.setRecruitHold(0);
        // 新增需审批，其余直接生效
        boolean needApproval = "新增".equals(line.getEstPlanType());
        line.setEstStatus(needApproval ? "待审批" : "生效中");
        lineMapper.insert(line);
        log(line.getId(), "新增", null, "编制数量 " + line.getQuota(), "创建编制行");
        return line;
    }

    @Transactional
    public void adjust(Long id, Integer newQuota, String reason, String adjustType) {
        EstLine line = mustGet(id);
        if (!"生效中".equals(line.getEstStatus())) throw new BizException("仅生效中的编制可调整");
        if (newQuota == null || newQuota < 0 || newQuota > 9999) throw new BizException("编制数量须在 0-9999 之间");
        // 调增需审批，调减直接生效
        if (newQuota > line.getQuota()) {
            line.setEstStatus("待审批");
            line.setRemark("调增至 " + newQuota + "，待审批");
            log(id, "调增", String.valueOf(line.getQuota()), String.valueOf(newQuota), reason);
        } else {
            log(id, "调减", String.valueOf(line.getQuota()), String.valueOf(newQuota), reason);
            line.setQuota(newQuota);
        }
        lineMapper.updateById(line);
    }

    @Transactional
    public void approve(Long id, boolean pass, String reason) {
        EstLine line = mustGet(id);
        if (!"待审批".equals(line.getEstStatus())) throw new BizException("该编制行不在待审批状态");
        if (pass) {
            // 审批通过：若备注含调增则应用新数量
            if (line.getRemark() != null && line.getRemark().startsWith("调增至 ")) {
                int newQuota = Integer.parseInt(line.getRemark().replaceAll("调增至 (\\d+).*", "$1"));
                line.setQuota(newQuota);
                line.setRemark(null);
            }
            line.setEstStatus("生效中");
            log(id, "审批通过", "待审批", "生效中", reason);
        } else {
            line.setEstStatus("已驳回");
            log(id, "审批驳回", "待审批", "已驳回", reason);
        }
        lineMapper.updateById(line);
    }

    @Transactional
    public void toggleStatus(Long id, boolean enable, String reason) {
        EstLine line = mustGet(id);
        if (enable) {
            if (!"已停用".equals(line.getEstStatus())) throw new BizException("仅已停用的编制可启用");
            line.setEstStatus("生效中");
            log(id, "启用", "已停用", "生效中", reason);
        } else {
            if (!"生效中".equals(line.getEstStatus())) throw new BizException("仅生效中的编制可停用");
            line.setEstStatus("已停用");
            log(id, "停用", "生效中", "已停用", reason);
        }
        lineMapper.updateById(line);
    }

    /** 外包超编：劳务外包且可用缺额 < 0 */
    public List<Map<String, Object>> outsourceOver() {
        return lineMapper.selectList(new LambdaQueryWrapper<EstLine>()
                        .eq(EstLine::getEmpType, "劳务外包").eq(EstLine::getEstStatus, "生效中"))
                .stream().filter(l -> vacancy(l) < 0).map(this::toView).toList();
    }

    public List<EstIncumbent> incumbents(Long estLineId) {
        return incumbentMapper.selectList(new LambdaQueryWrapper<EstIncumbent>()
                .eq(EstIncumbent::getEstLineId, estLineId).orderByDesc(EstIncumbent::getCreateTime));
    }

    @Transactional
    public void confirmIncumbent(Long incumbentId, String overRemark) {
        EstIncumbent inc = incumbentMapper.selectById(incumbentId);
        if (inc == null) throw new BizException("在编记录不存在");
        inc.setConfirmStatus("已确认");
        inc.setOverRemark(overRemark);
        incumbentMapper.updateById(inc);
        log(inc.getEstLineId(), "在编确认", "待编制确认", "已确认", overRemark);
    }

    public List<EstChangeLog> logs(Long estLineId) {
        return changeLogMapper.selectList(new LambdaQueryWrapper<EstChangeLog>()
                .eq(EstChangeLog::getEstLineId, estLineId).orderByDesc(EstChangeLog::getCreateTime));
    }

    /** 规划视图 */
    public List<Map<String, Object>> plans(Integer year) {
        return planMapper.selectList(new LambdaQueryWrapper<EstPlan>()
                        .eq(year != null, EstPlan::getYear, year)
                        .orderByAsc(EstPlan::getOrgName).orderByAsc(EstPlan::getLevelCategory))
                .stream().map(p -> {
                    Map<String, Object> m = new HashMap<String, Object>();
                    int target = (p.getOriginQuota() == null ? 0 : p.getOriginQuota()) + (p.getAdjustQuota() == null ? 0 : p.getAdjustQuota());
                    m.put("id", String.valueOf(p.getId()));
                    m.put("year", p.getYear());
                    m.put("orgName", p.getOrgName());
                    m.put("levelCategory", p.getLevelCategory());
                    m.put("originQuota", p.getOriginQuota());
                    m.put("adjustQuota", p.getAdjustQuota());
                    m.put("adjustReason", p.getAdjustReason());
                    m.put("marchHeadcount", p.getMarchHeadcount());
                    m.put("targetQuota", target);
                    m.put("achieveRate", target == 0 ? null : Math.round(p.getMarchHeadcount() * 1000.0 / target) / 10.0);
                    return m;
                }).toList();
    }

    @Transactional
    public void savePlan(EstPlan plan) {
        if (plan.getId() == null) throw new BizException("规划行只能调整，不能新增");
        EstPlan db = planMapper.selectById(plan.getId());
        if (db == null) throw new BizException("规划行不存在");
        db.setAdjustQuota(plan.getAdjustQuota());
        db.setAdjustReason(plan.getAdjustReason());
        planMapper.updateById(db);
    }

    private EstLine mustGet(Long id) {
        EstLine line = lineMapper.selectById(id);
        if (line == null) throw new BizException("编制行不存在");
        return line;
    }

    private String nextEstNo(int year) {
        long count = lineMapper.selectCount(new LambdaQueryWrapper<EstLine>().likeRight(EstLine::getEstNo, "EST-" + year));
        return String.format("EST-%d-%04d", year, count + 1);
    }

    private void log(Long lineId, String type, String before, String after, String reason) {
        EstChangeLog l = new EstChangeLog();
        l.setEstLineId(lineId);
        l.setChangeType(type);
        l.setBeforeValue(before);
        l.setAfterValue(after);
        l.setReason(reason);
        var u = UserContext.get();
        l.setOperator(u == null ? "system" : u.getRealName());
        l.setCreateTime(java.time.LocalDateTime.now());
        changeLogMapper.insert(l);
    }
}
