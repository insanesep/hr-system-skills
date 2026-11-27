package com.hrbp.service.recruit;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hrbp.common.core.BizException;
import com.hrbp.common.core.PageResult;
import com.hrbp.common.security.UserContext;
import com.hrbp.domain.est.entity.EstLine;
import com.hrbp.domain.est.mapper.EstLineMapper;
import com.hrbp.domain.recruit.entity.RecruitDemand;
import com.hrbp.domain.recruit.entity.RecruitDemandGrant;
import com.hrbp.domain.recruit.entity.RecruitOpLog;
import com.hrbp.domain.recruit.mapper.RecruitDemandGrantMapper;
import com.hrbp.domain.recruit.mapper.RecruitDemandMapper;
import com.hrbp.domain.recruit.mapper.RecruitOpLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RecruitDemandService {
    private final RecruitDemandMapper demandMapper;
    private final RecruitDemandGrantMapper grantMapper;
    private final RecruitOpLogMapper opLogMapper;
    private final EstLineMapper estLineMapper;

    /** 招聘天数 = 创建至今 */
    public long recruitDays(RecruitDemand d) {
        return d.getCreateTime() == null ? 0 : ChronoUnit.DAYS.between(d.getCreateTime().toLocalDate(), LocalDate.now());
    }

    /** 预警状态：需升级（≥150天或期望到岗已过且缺口>0）/ 需关注（≥90天）/ 正常 */
    public String alertLevel(RecruitDemand d) {
        if (!"招聘中".equals(d.getDemandStatus())) return "正常";
        int gap = d.getHeadcount() - (d.getArrived() == null ? 0 : d.getArrived());
        long days = recruitDays(d);
        boolean overdue = d.getExpectDate() != null && d.getExpectDate().isBefore(LocalDate.now()) && gap > 0;
        if (days >= 150 || overdue) return "需升级";
        if (days >= 90) return "需关注";
        return "正常";
    }

    public PageResult<Map<String, Object>> page(String keyword, String demandStatus, String jobCategory,
                                                Boolean outsource, String quarter, long pageNum, long pageSize) {
        LambdaQueryWrapper<RecruitDemand> qw = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            qw.and(w -> w.like(RecruitDemand::getDemandNo, keyword).or().like(RecruitDemand::getPositionName, keyword));
        }
        if (demandStatus != null && !demandStatus.isBlank()) qw.eq(RecruitDemand::getDemandStatus, demandStatus);
        if (jobCategory != null && !jobCategory.isBlank()) qw.eq(RecruitDemand::getJobCategory, jobCategory);
        if (quarter != null && !quarter.isBlank()) qw.eq(RecruitDemand::getRecruitQuarter, quarter);
        if (outsource != null) qw.eq(RecruitDemand::getOutsourceFlag, outsource ? 1 : 0);
        qw.orderByDesc(RecruitDemand::getCreateTime);
        Page<RecruitDemand> page = demandMapper.selectPage(new Page<>(pageNum, pageSize), qw);
        PageResult<RecruitDemand> raw = PageResult.of(page);
        PageResult<Map<String, Object>> result = new PageResult<>();
        result.setTotal(raw.getTotal());
        result.setPageNum(raw.getPageNum());
        result.setPageSize(raw.getPageSize());
        result.setList(raw.getList().stream().map(this::toView).toList());
        return result;
    }

    private Map<String, Object> toView(RecruitDemand d) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", String.valueOf(d.getId()));
        m.put("demandNo", d.getDemandNo());
        m.put("recruitQuarter", d.getRecruitQuarter());
        m.put("deptPath", d.getDeptPath());
        m.put("positionName", d.getPositionName());
        m.put("jobLevel", d.getJobLevel());
        m.put("jobCategory", d.getJobCategory());
        m.put("empType", d.getEmpType());
        m.put("headcount", d.getHeadcount());
        m.put("arrived", d.getArrived());
        m.put("offered", d.getOffered());
        m.put("accepted", d.getAccepted());
        m.put("inTransit", d.getInTransit());
        m.put("gap", d.getHeadcount() - (d.getArrived() == null ? 0 : d.getArrived()));
        m.put("demandStatus", d.getDemandStatus());
        m.put("warningFlag", d.getWarningFlag());
        m.put("alertLevel", alertLevel(d));
        m.put("recruitDays", recruitDays(d));
        m.put("expectDate", d.getExpectDate());
        m.put("finalInterviewer", d.getFinalInterviewer());
        m.put("recruitOwner", d.getRecruitOwner());
        m.put("collaborateHr", d.getCollaborateHr());
        m.put("outsourceFlag", d.getOutsourceFlag());
        m.put("estLineId", d.getEstLineId() == null ? null : String.valueOf(d.getEstLineId()));
        m.put("deptId", String.valueOf(d.getDeptId()));
        m.put("positionId", d.getPositionId() == null ? null : String.valueOf(d.getPositionId()));
        m.put("workNature", d.getWorkNature());
        return m;
    }

    /** 统计卡：在招需求/需求总人数/已到岗/在途Offer/需升级 */
    public Map<String, Object> stats(Boolean outsource) {
        List<RecruitDemand> recruiting = demandMapper.selectList(new LambdaQueryWrapper<RecruitDemand>()
                .eq(RecruitDemand::getDemandStatus, "招聘中")
                .eq(outsource != null, RecruitDemand::getOutsourceFlag, Boolean.TRUE.equals(outsource) ? 1 : 0));
        Map<String, Object> m = new HashMap<>();
        m.put("recruiting", recruiting.size());
        m.put("headcountTotal", recruiting.stream().mapToInt(d -> d.getHeadcount() == null ? 0 : d.getHeadcount()).sum());
        m.put("arrivedTotal", recruiting.stream().mapToInt(d -> d.getArrived() == null ? 0 : d.getArrived()).sum());
        m.put("inTransitTotal", recruiting.stream().mapToInt(d -> (d.getAccepted() == null ? 0 : d.getAccepted()) + (d.getInTransit() == null ? 0 : d.getInTransit())).sum());
        m.put("alertCount", recruiting.stream().filter(d -> "需升级".equals(alertLevel(d))).count());
        long pending = demandMapper.selectCount(new LambdaQueryWrapper<RecruitDemand>().eq(RecruitDemand::getDemandStatus, "待审批"));
        m.put("pendingApproval", pending);
        return m;
    }

    @Transactional
    public RecruitDemand create(RecruitDemand d) {
        // 编制缺额校验：引用生效中编制行
        if (d.getEstLineId() != null) {
            EstLine line = estLineMapper.selectById(d.getEstLineId());
            if (line == null || !"生效中".equals(line.getEstStatus())) {
                throw new BizException("关联编制行不存在或未生效");
            }
            int vacancy = (line.getQuota() == null ? 0 : line.getQuota())
                    - (line.getIncumbent() == null ? 0 : line.getIncumbent())
                    - (line.getRecruitHold() == null ? 0 : line.getRecruitHold());
            if (d.getHeadcount() > vacancy) {
                d.setWarningFlag("超编需求");
            }
            // 新增/保留计划才可发起招聘
            if (!"新增".equals(line.getEstPlanType()) && !"保留".equals(line.getEstPlanType())) {
                throw new BizException("仅新增/保留计划的编制行可发起招聘");
            }
        }
        d.setDemandNo(nextDemandNo());
        d.setDemandStatus("草稿");
        d.setArrived(0);
        d.setOffered(0);
        d.setAccepted(0);
        d.setInTransit(0);
        if (d.getOutsourceFlag() == null) d.setOutsourceFlag("劳务外包".equals(d.getEmpType()) ? 1 : 0);
        demandMapper.insert(d);
        log(d.getId(), "新建需求", "需求人数 " + d.getHeadcount());
        return d;
    }

    @Transactional
    public void update(RecruitDemand d) {
        RecruitDemand db = mustGet(d.getId());
        if (!"草稿".equals(db.getDemandStatus()) && !"待审批".equals(db.getDemandStatus())) {
            throw new BizException("仅草稿/待审批状态可编辑");
        }
        demandMapper.updateById(d);
        log(d.getId(), "编辑需求", null);
    }

    @Transactional
    public void submit(Long id) {
        RecruitDemand db = mustGet(id);
        if (!"草稿".equals(db.getDemandStatus())) throw new BizException("仅草稿可提交审批");
        db.setDemandStatus("待审批");
        demandMapper.updateById(db);
        log(id, "提交审批", null);
    }

    @Transactional
    public void approve(Long id, boolean pass, String reason) {
        RecruitDemand db = mustGet(id);
        if (!"待审批".equals(db.getDemandStatus())) throw new BizException("该需求不在待审批状态");
        if (pass) {
            db.setDemandStatus("招聘中");
            // 编制占用 +headcount
            if (db.getEstLineId() != null) {
                EstLine line = estLineMapper.selectById(db.getEstLineId());
                line.setRecruitHold((line.getRecruitHold() == null ? 0 : line.getRecruitHold()) + db.getHeadcount());
                estLineMapper.updateById(line);
            }
            log(id, "审批通过", reason);
        } else {
            db.setDemandStatus("草稿");
            log(id, "审批驳回", reason);
        }
        demandMapper.updateById(db);
    }

    @Transactional
    public void close(Long id, String reason) {
        RecruitDemand db = mustGet(id);
        if ("已完成".equals(db.getDemandStatus()) || "已关闭".equals(db.getDemandStatus())) {
            throw new BizException("已是终态");
        }
        int inTransit = (db.getInTransit() == null ? 0 : db.getInTransit()) + (db.getAccepted() == null ? 0 : db.getAccepted());
        if (inTransit > 0) throw new BizException("存在在途/已接受未入职 Offer，须先清理");
        // 释放编制占用
        if (db.getEstLineId() != null && "招聘中".equals(db.getDemandStatus())) {
            EstLine line = estLineMapper.selectById(db.getEstLineId());
            int remain = db.getHeadcount() - (db.getArrived() == null ? 0 : db.getArrived());
            line.setRecruitHold(Math.max(0, (line.getRecruitHold() == null ? 0 : line.getRecruitHold()) - remain));
            estLineMapper.updateById(line);
        }
        db.setDemandStatus("已关闭");
        demandMapper.updateById(db);
        log(id, "关闭需求", reason);
    }

    public Map<String, Object> detail(Long id) {
        RecruitDemand d = mustGet(id);
        Map<String, Object> m = toView(d);
        m.put("grants", grantMapper.selectList(new LambdaQueryWrapper<RecruitDemandGrant>()
                .eq(RecruitDemandGrant::getDemandId, id).eq(RecruitDemandGrant::getRevoked, 0)));
        m.put("logs", logs(id));
        return m;
    }

    public List<RecruitOpLog> logs(Long id) {
        return opLogMapper.selectList(new LambdaQueryWrapper<RecruitOpLog>()
                .eq(RecruitOpLog::getBizType, "需求").eq(RecruitOpLog::getBizId, id)
                .orderByDesc(RecruitOpLog::getCreateTime));
    }

    @Transactional
    public void grant(Long id, String granteeName) {
        RecruitDemandGrant g = new RecruitDemandGrant();
        g.setDemandId(id);
        g.setGranteeName(granteeName);
        g.setGrantBy(UserContext.get() == null ? "system" : UserContext.get().getRealName());
        g.setRevoked(0);
        grantMapper.insert(g);
        log(id, "新增授权", granteeName);
    }

    @Transactional
    public void revokeGrant(Long grantId) {
        RecruitDemandGrant g = grantMapper.selectById(grantId);
        if (g == null) throw new BizException("授权记录不存在");
        g.setRevoked(1);
        grantMapper.updateById(g);
        log(g.getDemandId(), "撤销授权", g.getGranteeName());
    }

    private RecruitDemand mustGet(Long id) {
        RecruitDemand d = demandMapper.selectById(id);
        if (d == null) throw new BizException("需求不存在");
        return d;
    }

    private String nextDemandNo() {
        int year = LocalDate.now().getYear();
        long count = demandMapper.selectCount(new LambdaQueryWrapper<RecruitDemand>().likeRight(RecruitDemand::getDemandNo, "XQ-" + year));
        return String.format("XQ-%d-%04d", year, count + 1);
    }

    private void log(Long bizId, String opType, String content) {
        RecruitOpLog l = new RecruitOpLog();
        l.setBizType("需求");
        l.setBizId(bizId);
        l.setOpType(opType);
        l.setContent(content);
        l.setOperator(UserContext.get() == null ? "system" : UserContext.get().getRealName());
        l.setCreateTime(java.time.LocalDateTime.now());
        opLogMapper.insert(l);
    }
}
