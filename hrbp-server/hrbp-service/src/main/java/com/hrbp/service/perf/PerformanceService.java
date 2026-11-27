package com.hrbp.service.perf;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hrbp.common.core.BizException;
import com.hrbp.common.core.PageResult;
import com.hrbp.domain.employee.entity.EmpEmployee;
import com.hrbp.domain.employee.entity.EmpPerfRecord;
import com.hrbp.domain.employee.mapper.EmpEmployeeMapper;
import com.hrbp.domain.employee.mapper.EmpPerfRecordMapper;
import com.hrbp.domain.perf.entity.*;
import com.hrbp.domain.perf.mapper.*;
import com.hrbp.service.flow.GrowthEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PerformanceService {
    private final PerfPeriodMapper periodMapper;
    private final PerfTargetMapper targetMapper;
    private final PerfReviewMapper reviewMapper;
    private final PerfReviewItemMapper itemMapper;
    private final PerfGradeConfigMapper gradeConfigMapper;
    private final EmpPerfRecordMapper empPerfRecordMapper;
    private final EmpEmployeeMapper employeeMapper;
    private final GrowthEventService growthService;

    // ========== 周期 ==========
    public List<PerfPeriod> listPeriods() {
        return periodMapper.selectList(new LambdaQueryWrapper<PerfPeriod>().orderByDesc(PerfPeriod::getId));
    }

    @Transactional
    public void advanceStage(Long periodId, String stage) {
        PerfPeriod p = periodMapper.selectById(periodId);
        if (p == null) throw new BizException("周期不存在");
        List<String> order = List.of("目标设定", "目标已生效", "自评中", "上级评价中", "团队通晒", "中心通晒", "结果已生效", "已归档");
        if (order.indexOf(stage) <= order.indexOf(p.getStage())) throw new BizException("阶段只前进不可回退");
        p.setStage(stage);
        periodMapper.updateById(p);
    }

    // ========== 目标 ==========
    public List<PerfTarget> listTargets(Long periodId, Long empId) {
        LambdaQueryWrapper<PerfTarget> qw = new LambdaQueryWrapper<>();
        if (periodId != null) qw.eq(PerfTarget::getPeriodId, periodId);
        if (empId != null) qw.eq(PerfTarget::getEmpId, empId);
        return targetMapper.selectList(qw.orderByAsc(PerfTarget::getId));
    }

    /** 保存目标组：权重合计必须 100% */
    @Transactional
    public void saveTargets(Long periodId, Long empId, String empName, List<PerfTarget> targets) {
        int total = targets.stream().mapToInt(t -> t.getWeight() == null ? 0 : t.getWeight()).sum();
        if (total != 100) throw new BizException("权重合计必须等于 100%，当前 " + total + "%");
        // 清旧存新（草稿态）
        targetMapper.delete(new LambdaQueryWrapper<PerfTarget>()
                .eq(PerfTarget::getPeriodId, periodId).eq(PerfTarget::getEmpId, empId)
                .eq(PerfTarget::getStatus, "草稿"));
        for (PerfTarget t : targets) {
            t.setId(null);
            t.setPeriodId(periodId);
            t.setEmpId(empId);
            t.setEmpName(empName);
            t.setOwnerType("个人");
            t.setStatus("草稿");
            t.setVersion(1);
            targetMapper.insert(t);
        }
    }

    @Transactional
    public void submitTargets(Long periodId, Long empId) {
        List<PerfTarget> list = listTargets(periodId, empId);
        int total = list.stream().mapToInt(t -> t.getWeight() == null ? 0 : t.getWeight()).sum();
        if (total != 100) throw new BizException("权重合计必须等于 100%，禁止提交");
        list.forEach(t -> { t.setStatus("待确认"); targetMapper.updateById(t); });
    }

    @Transactional
    public void confirmTargets(Long periodId, Long empId, boolean confirm, String reason) {
        List<PerfTarget> list = listTargets(periodId, empId);
        if (list.isEmpty()) throw new BizException("无目标数据");
        String empName = list.get(0).getEmpName();
        list.forEach(t -> {
            t.setStatus(confirm ? "已生效" : "草稿");
            targetMapper.updateById(t);
        });
        // 目标生效时生成考核表与评价项快照
        if (confirm) {
            PerfReview exist = reviewMapper.selectOne(new LambdaQueryWrapper<PerfReview>()
                    .eq(PerfReview::getPeriodId, periodId).eq(PerfReview::getEmpId, empId));
            if (exist == null) {
                PerfReview r = new PerfReview();
                r.setPeriodId(periodId);
                r.setEmpId(empId);
                r.setEmpName(empName);
                r.setDeptName(list.get(0).getDeptName());
                r.setStatus("未开始");
                reviewMapper.insert(r);
                for (PerfTarget t : list) {
                    PerfReviewItem item = new PerfReviewItem();
                    item.setReviewId(r.getId());
                    item.setTargetTitle(t.getTitle());
                    item.setWeight(t.getWeight());
                    itemMapper.insert(item);
                }
            }
        }
    }

    // ========== 评价 ==========
    public PageResult<PerfReview> reviewPage(Long periodId, String status, String keyword, long pageNum, long pageSize) {
        LambdaQueryWrapper<PerfReview> qw = new LambdaQueryWrapper<>();
        if (periodId != null) qw.eq(PerfReview::getPeriodId, periodId);
        if (status != null && !status.isBlank()) qw.eq(PerfReview::getStatus, status);
        if (keyword != null && !keyword.isBlank()) qw.like(PerfReview::getEmpName, keyword);
        return PageResult.of(reviewMapper.selectPage(new Page<>(pageNum, pageSize), qw));
    }

    public List<PerfReviewItem> reviewItems(Long reviewId) {
        return itemMapper.selectList(new LambdaQueryWrapper<PerfReviewItem>()
                .eq(PerfReviewItem::getReviewId, reviewId).orderByAsc(PerfReviewItem::getId));
    }

    /** 自评提交 */
    @Transactional
    public void submitSelf(Long reviewId, List<PerfReviewItem> items) {
        PerfReview r = mustGetReview(reviewId);
        for (PerfReviewItem it : items) {
            PerfReviewItem db = itemMapper.selectById(it.getId());
            if (db != null) {
                db.setSelfScore(it.getSelfScore());
                db.setSelfComment(it.getSelfComment());
                itemMapper.updateById(db);
            }
        }
        r.setSelfScore(weighted(reviewId, true));
        r.setStatus("待上级评价");
        reviewMapper.updateById(r);
    }

    /** 上级评价提交：计算加权总分 + 建议等级 */
    @Transactional
    public void submitManager(Long reviewId, List<PerfReviewItem> items) {
        PerfReview r = mustGetReview(reviewId);
        for (PerfReviewItem it : items) {
            PerfReviewItem db = itemMapper.selectById(it.getId());
            if (db != null) {
                db.setManagerScore(it.getManagerScore());
                db.setManagerComment(it.getManagerComment());
                itemMapper.updateById(db);
            }
        }
        BigDecimal total = weighted(reviewId, false);
        r.setManagerScore(total);
        r.setSuggestGrade(suggestGrade(total));
        r.setStatus("待通晒");
        reviewMapper.updateById(r);
    }

    /** 加权总分 = Σ(评分 × 权重) ÷ 100 */
    private BigDecimal weighted(Long reviewId, boolean self) {
        List<PerfReviewItem> items = reviewItems(reviewId);
        BigDecimal sum = BigDecimal.ZERO;
        for (PerfReviewItem it : items) {
            BigDecimal score = self ? it.getSelfScore() : it.getManagerScore();
            if (score != null && it.getWeight() != null) {
                sum = sum.add(score.multiply(BigDecimal.valueOf(it.getWeight())));
            }
        }
        return sum.divide(BigDecimal.valueOf(100), 1, RoundingMode.HALF_UP);
    }

    private String suggestGrade(BigDecimal score) {
        List<PerfGradeConfig> configs = gradeConfigMapper.selectList(
                new LambdaQueryWrapper<PerfGradeConfig>().orderByDesc(PerfGradeConfig::getScoreFloor));
        for (PerfGradeConfig c : configs) {
            if (score.compareTo(c.getScoreFloor()) >= 0) return c.getGrade();
        }
        return "D";
    }

    // ========== 通晒 ==========
    /** 通晒确认：定最终等级并锁定生效 → 写员工绩效记录 + 成长事件 */
    @Transactional
    public void calibrate(Long reviewId, String finalGrade, String followPlan, String nonBReason) {
        PerfReview r = mustGetReview(reviewId);
        if (!"待通晒".equals(r.getStatus()) && !"已校准".equals(r.getStatus())) {
            throw new BizException("当前状态不可通晒");
        }
        if (!"B".equals(finalGrade) && (nonBReason == null || nonBReason.isBlank())) {
            throw new BizException("非 B 等级必须填写原因");
        }
        r.setFinalGrade(finalGrade);
        r.setFollowPlan(followPlan);
        r.setNonBReason(nonBReason);
        r.setStatus("已生效");
        reviewMapper.updateById(r);
        // 写员工档案绩效记录
        PerfPeriod p = periodMapper.selectById(r.getPeriodId());
        EmpPerfRecord rec = new EmpPerfRecord();
        rec.setEmpId(r.getEmpId());
        rec.setPeriodName(p.getPeriodName());
        rec.setGrade(finalGrade);
        rec.setScore(r.getManagerScore());
        rec.setEvaluator("绩效通晒");
        rec.setEvalDate(LocalDate.now());
        empPerfRecordMapper.insert(rec);
        EmpEmployee emp = employeeMapper.selectById(r.getEmpId());
        growthService.emit(r.getEmpId(), emp == null ? null : emp.getEmpNo(), r.getEmpName(), "绩效", LocalDate.now(),
                r.getEmpName() + " " + p.getPeriodName() + " 绩效 " + finalGrade,
                "上级评分 " + r.getManagerScore() + "，最终等级 " + finalGrade,
                "绩效管理", "PERF-" + reviewId, 1);
    }

    public List<PerfGradeConfig> gradeConfigs() {
        return gradeConfigMapper.selectList(new LambdaQueryWrapper<PerfGradeConfig>().orderByDesc(PerfGradeConfig::getScoreFloor));
    }

    @Transactional
    public void saveGradeConfig(PerfGradeConfig c) {
        gradeConfigMapper.updateById(c);
    }

    private PerfReview mustGetReview(Long id) {
        PerfReview r = reviewMapper.selectById(id);
        if (r == null) throw new BizException("考核表不存在");
        return r;
    }
}
