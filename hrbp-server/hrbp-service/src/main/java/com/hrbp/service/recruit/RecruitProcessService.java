package com.hrbp.service.recruit;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hrbp.common.core.BizException;
import com.hrbp.common.core.PageResult;
import com.hrbp.common.security.UserContext;
import com.hrbp.domain.recruit.entity.*;
import com.hrbp.domain.recruit.mapper.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RecruitProcessService {
    private final RecruitJobMapper jobMapper;
    private final RecruitCandidateMapper candidateMapper;
    private final RecruitApplicationMapper applicationMapper;
    private final RecruitInterviewMapper interviewMapper;
    private final RecruitOfferMapper offerMapper;
    private final RecruitDemandMapper demandMapper;
    private final RecruitOpLogMapper opLogMapper;

    // ========== 职位 ==========
    public List<RecruitJob> listJobs(Long demandId, String jobStatus) {
        LambdaQueryWrapper<RecruitJob> qw = new LambdaQueryWrapper<>();
        if (demandId != null) qw.eq(RecruitJob::getDemandId, demandId);
        if (jobStatus != null && !jobStatus.isBlank()) qw.eq(RecruitJob::getJobStatus, jobStatus);
        return jobMapper.selectList(qw.orderByDesc(RecruitJob::getCreateTime));
    }

    @Transactional
    public RecruitJob createJob(RecruitJob job) {
        RecruitDemand d = demandMapper.selectById(job.getDemandId());
        if (d == null || !"招聘中".equals(d.getDemandStatus())) throw new BizException("需求不存在或未在招聘中");
        long count = jobMapper.selectCount(null);
        job.setJobNo(String.format("J-%05d", count + 1));
        job.setJobStatus("在招");
        job.setHired(0);
        jobMapper.insert(job);
        log("职位", job.getId(), "新建职位", job.getPositionName());
        return job;
    }

    @Transactional
    public void changeJobStatus(Long id, String status) {
        RecruitJob job = jobMapper.selectById(id);
        if (job == null) throw new BizException("职位不存在");
        job.setJobStatus(status);
        jobMapper.updateById(job);
        log("职位", id, "状态变更", status);
    }

    // ========== 应聘者 ==========
    public PageResult<RecruitCandidate> candidatePage(String keyword, long pageNum, long pageSize) {
        LambdaQueryWrapper<RecruitCandidate> qw = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            qw.and(w -> w.like(RecruitCandidate::getName, keyword)
                    .or().like(RecruitCandidate::getPhone, keyword)
                    .or().like(RecruitCandidate::getCurrentCompany, keyword));
        }
        qw.orderByDesc(RecruitCandidate::getCreateTime);
        return PageResult.of(candidateMapper.selectPage(new Page<>(pageNum, pageSize), qw));
    }

    @Transactional
    public RecruitCandidate saveCandidate(RecruitCandidate c) {
        LambdaQueryWrapper<RecruitCandidate> qw = new LambdaQueryWrapper<RecruitCandidate>().eq(RecruitCandidate::getPhone, c.getPhone());
        if (c.getId() != null) qw.ne(RecruitCandidate::getId, c.getId());
        if (candidateMapper.selectCount(qw) > 0) throw new BizException("手机号已存在相同应聘者（查重拦截）");
        if (c.getId() == null) {
            c.setTalentPool(0);
            candidateMapper.insert(c);
            log("应聘者", c.getId(), "新建应聘者", c.getName());
        } else {
            candidateMapper.updateById(c);
        }
        return c;
    }

    @Transactional
    public void lockCandidate(Long id, boolean lock) {
        RecruitCandidate c = candidateMapper.selectById(id);
        if (c == null) throw new BizException("应聘者不存在");
        String me = UserContext.get() == null ? "system" : UserContext.get().getRealName();
        if (lock) {
            if (c.getLockExpire() != null && c.getLockExpire().isAfter(LocalDateTime.now()) && !me.equals(c.getLockBy())) {
                throw new BizException("已被 " + c.getLockBy() + " 锁定，到期时间 " + c.getLockExpire());
            }
            c.setLockBy(me);
            c.setLockExpire(LocalDateTime.now().plusDays(7));
        } else {
            c.setLockBy(null);
            c.setLockExpire(null);
        }
        candidateMapper.updateById(c);
        log("应聘者", id, lock ? "锁定7天" : "释放锁定", me);
    }

    // ========== 投递 ==========
    public PageResult<Map<String, Object>> applicationPage(Long jobId, String applyStatus, String keyword, long pageNum, long pageSize) {
        LambdaQueryWrapper<RecruitApplication> qw = new LambdaQueryWrapper<>();
        if (jobId != null) qw.eq(RecruitApplication::getJobId, jobId);
        if (applyStatus != null && !applyStatus.isBlank()) qw.eq(RecruitApplication::getApplyStatus, applyStatus);
        qw.orderByDesc(RecruitApplication::getCreateTime);
        Page<RecruitApplication> page = applicationMapper.selectPage(new Page<>(pageNum, pageSize), qw);
        // 关联候选人姓名
        PageResult<RecruitApplication> raw = PageResult.of(page);
        PageResult<Map<String, Object>> result = new PageResult<>();
        result.setTotal(raw.getTotal());
        result.setPageNum(raw.getPageNum());
        result.setPageSize(raw.getPageSize());
        result.setList(raw.getList().stream().map(a -> {
            Map<String, Object> m = new HashMap<String, Object>();
            m.put("id", String.valueOf(a.getId()));
            m.put("jobId", String.valueOf(a.getJobId()));
            m.put("demandId", String.valueOf(a.getDemandId()));
            m.put("candidateId", String.valueOf(a.getCandidateId()));
            RecruitCandidate c = candidateMapper.selectById(a.getCandidateId());
            m.put("candidateName", c == null ? "?" : c.getName());
            m.put("phone", c == null ? null : c.getPhone());
            RecruitJob j = jobMapper.selectById(a.getJobId());
            m.put("positionName", j == null ? null : j.getPositionName());
            m.put("applyStatus", a.getApplyStatus());
            m.put("entrySource", a.getEntrySource());
            m.put("firstResult", a.getFirstResult());
            m.put("secondResult", a.getSecondResult());
            m.put("finalResult", a.getFinalResult());
            m.put("onboardDate", a.getOnboardDate());
            m.put("isHired", a.getIsHired());
            m.put("createTime", a.getCreateTime());
            return m;
        }).toList());
        if (keyword != null && !keyword.isBlank()) {
            result.setList(result.getList().stream().filter(m -> String.valueOf(m.get("candidateName")).contains(keyword)).toList());
        }
        return result;
    }

    @Transactional
    public RecruitApplication apply(Long jobId, Long candidateId, String entrySource) {
        RecruitJob job = jobMapper.selectById(jobId);
        if (job == null || !"在招".equals(job.getJobStatus())) throw new BizException("职位不存在或未在招");
        RecruitCandidate c = candidateMapper.selectById(candidateId);
        if (c == null) throw new BizException("应聘者不存在");
        // 同职位重复投递拦截
        long dup = applicationMapper.selectCount(new LambdaQueryWrapper<RecruitApplication>()
                .eq(RecruitApplication::getJobId, jobId).eq(RecruitApplication::getCandidateId, candidateId)
                .notIn(RecruitApplication::getApplyStatus, "已淘汰", "已放弃"));
        if (dup > 0) throw new BizException("该应聘者在此职位已有进行中的投递");
        RecruitApplication a = new RecruitApplication();
        a.setJobId(jobId);
        a.setDemandId(job.getDemandId());
        a.setCandidateId(candidateId);
        a.setApplyStatus("待筛选");
        a.setEntrySource(entrySource == null ? "过程创建" : entrySource);
        applicationMapper.insert(a);
        log("台账", a.getId(), "新建投递", c.getName() + " → " + job.getPositionName());
        return a;
    }

    @Transactional
    public void changeApplyStatus(Long id, String status, String quitReason) {
        RecruitApplication a = applicationMapper.selectById(id);
        if (a == null) throw new BizException("投递不存在");
        a.setApplyStatus(status);
        if (quitReason != null) a.setQuitReason(quitReason);
        // 淘汰/放弃释放预占
        if ("已淘汰".equals(status) || "已放弃".equals(status)) {
            a.setPreHold(0);
        }
        applicationMapper.updateById(a);
        log("台账", id, "状态变更", status);
    }

    // ========== 面试 ==========
    public List<RecruitInterview> listInterviews(Long applicationId, String interviewer) {
        LambdaQueryWrapper<RecruitInterview> qw = new LambdaQueryWrapper<>();
        if (applicationId != null) qw.eq(RecruitInterview::getApplicationId, applicationId);
        if (interviewer != null && !interviewer.isBlank()) qw.eq(RecruitInterview::getInterviewer, interviewer);
        return qw.orderByAsc(RecruitInterview::getInterviewTime) == null ? List.of()
                : interviewMapper.selectList(qw.orderByAsc(RecruitInterview::getInterviewTime));
    }

    @Transactional
    public RecruitInterview createInterview(RecruitInterview iv) {
        RecruitApplication a = applicationMapper.selectById(iv.getApplicationId());
        if (a == null) throw new BizException("投递不存在");
        iv.setInviteStatus("待邀约");
        iv.setInterviewStatus("待面试");
        interviewMapper.insert(iv);
        // 推进投递状态到对应轮次
        String stage = switch (iv.getRound()) {
            case "初试" -> "初试";
            case "复试" -> "复试";
            case "终试" -> "终试";
            default -> null;
        };
        if (stage != null) {
            a.setApplyStatus(stage);
            applicationMapper.updateById(a);
        }
        log("面试", iv.getId(), "安排" + iv.getRound(), iv.getInterviewer());
        return iv;
    }

    /** 提交评价：任一淘汰即不通过，全部通过则推进；待定由负责人裁决（此版按待定处理） */
    @Transactional
    public void submitConclusion(Long id, String conclusion, String comment) {
        RecruitInterview iv = interviewMapper.selectById(id);
        if (iv == null) throw new BizException("面试场次不存在");
        iv.setConclusion(conclusion);
        iv.setComment(comment);
        iv.setInterviewStatus("已完成");
        interviewMapper.updateById(iv);
        RecruitApplication a = applicationMapper.selectById(iv.getApplicationId());
        String roundField = switch (iv.getRound()) {
            case "初试" -> "first";
            case "复试" -> "second";
            default -> "final";
        };
        if ("first".equals(roundField)) a.setFirstResult(conclusion);
        else if ("second".equals(roundField)) a.setSecondResult(conclusion);
        else a.setFinalResult(conclusion);
        if ("淘汰".equals(conclusion)) {
            a.setApplyStatus("已淘汰");
            a.setPreHold(0);
        }
        applicationMapper.updateById(a);
        log("面试", id, "提交评价", iv.getRound() + " " + conclusion);
    }

    // ========== Offer ==========
    public PageResult<RecruitOffer> offerPage(String offerStatus, long pageNum, long pageSize) {
        LambdaQueryWrapper<RecruitOffer> qw = new LambdaQueryWrapper<>();
        if (offerStatus != null && !offerStatus.isBlank()) qw.eq(RecruitOffer::getOfferStatus, offerStatus);
        qw.orderByDesc(RecruitOffer::getCreateTime);
        return PageResult.of(offerMapper.selectPage(new Page<>(pageNum, pageSize), qw));
    }

    /** 年度总包 = (月固定+月绩效) × 12 + 月固定 × 奖金月数 + 签字费 */
    private BigDecimal annualPackage(RecruitOffer o) {
        BigDecimal base = o.getMonthlyBase() == null ? BigDecimal.ZERO : o.getMonthlyBase();
        BigDecimal perf = o.getMonthlyPerf() == null ? BigDecimal.ZERO : o.getMonthlyPerf();
        BigDecimal months = o.getAnnualBonusMonths() == null ? BigDecimal.ZERO : o.getAnnualBonusMonths();
        BigDecimal sign = o.getSignBonus() == null ? BigDecimal.ZERO : o.getSignBonus();
        return base.add(perf).multiply(BigDecimal.valueOf(12)).add(base.multiply(months)).add(sign);
    }

    @Transactional
    public RecruitOffer createOffer(RecruitOffer o) {
        RecruitApplication a = applicationMapper.selectById(o.getApplicationId());
        if (a == null) throw new BizException("投递不存在");
        if (!"终试".equals(a.getApplyStatus()) && !"Offer".equals(a.getApplyStatus())) {
            throw new BizException("仅终试阶段可发起 Offer");
        }
        long count = offerMapper.selectCount(null);
        o.setOfferNo(String.format("OF-%d-%04d", LocalDate.now().getYear(), count + 1));
        o.setAnnualPackage(annualPackage(o));
        o.setOfferStatus("待审批");
        if (o.getValidUntil() == null) o.setValidUntil(LocalDate.now().plusDays(7));
        offerMapper.insert(o);
        a.setApplyStatus("Offer");
        applicationMapper.updateById(a);
        log("Offer", o.getId(), "发起Offer", o.getCandidateName() + " 年包 " + o.getAnnualPackage());
        return o;
    }

    @Transactional
    public void changeOfferStatus(Long id, String action) {
        RecruitOffer o = offerMapper.selectById(id);
        if (o == null) throw new BizException("Offer 不存在");
        RecruitApplication a = applicationMapper.selectById(o.getApplicationId());
        switch (action) {
            case "approve" -> {
                if (!"待审批".equals(o.getOfferStatus())) throw new BizException("当前状态不可审批");
                o.setOfferStatus("待发送");
            }
            case "send" -> {
                if (!"待发送".equals(o.getOfferStatus())) throw new BizException("当前状态不可发送");
                o.setOfferStatus("已发送");
            }
            case "accept" -> {
                if (!"已发送".equals(o.getOfferStatus())) throw new BizException("当前状态不可接受");
                o.setOfferStatus("已接受");
                a.setApplyStatus("待入职");
                a.setOnboardDate(o.getOnboardDate());
                applicationMapper.updateById(a);
                // 需求已接受 +1
                RecruitDemand d = demandMapper.selectById(a.getDemandId());
                d.setAccepted((d.getAccepted() == null ? 0 : d.getAccepted()) + 1);
                demandMapper.updateById(d);
            }
            case "reject" -> {
                o.setOfferStatus("已拒绝");
            }
            case "close" -> {
                o.setOfferStatus("已关闭");
            }
            default -> throw new BizException("不支持的操作");
        }
        offerMapper.updateById(o);
        log("Offer", id, "状态变更", action + " → " + o.getOfferStatus());
    }

    // ========== 工作台统计 ==========
    public Map<String, Object> processStats() {
        Map<String, Object> m = new HashMap<>();
        m.put("openJobs", jobMapper.selectCount(new LambdaQueryWrapper<RecruitJob>().eq(RecruitJob::getJobStatus, "在招")));
        m.put("candidates", candidateMapper.selectCount(null));
        m.put("pendingScreen", applicationMapper.selectCount(new LambdaQueryWrapper<RecruitApplication>().eq(RecruitApplication::getApplyStatus, "待筛选")));
        m.put("interviewing", applicationMapper.selectCount(new LambdaQueryWrapper<RecruitApplication>()
                .in(RecruitApplication::getApplyStatus, "初试", "复试", "终试")));
        m.put("offered", offerMapper.selectCount(new LambdaQueryWrapper<RecruitOffer>()
                .in(RecruitOffer::getOfferStatus, "待审批", "待发送", "已发送")));
        m.put("pendingOnboard", applicationMapper.selectCount(new LambdaQueryWrapper<RecruitApplication>().eq(RecruitApplication::getApplyStatus, "待入职")));
        return m;
    }

    private void log(String bizType, Long bizId, String opType, String content) {
        RecruitOpLog l = new RecruitOpLog();
        l.setBizType(bizType);
        l.setBizId(bizId);
        l.setOpType(opType);
        l.setContent(content);
        l.setOperator(UserContext.get() == null ? "system" : UserContext.get().getRealName());
        l.setCreateTime(LocalDateTime.now());
        opLogMapper.insert(l);
    }
}
