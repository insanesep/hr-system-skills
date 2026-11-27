package com.hrbp.service.recruit;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrbp.domain.recruit.entity.RecruitApplication;
import com.hrbp.domain.recruit.entity.RecruitCandidate;
import com.hrbp.domain.recruit.entity.RecruitDemand;
import com.hrbp.domain.recruit.entity.RecruitOffer;
import com.hrbp.domain.recruit.mapper.RecruitApplicationMapper;
import com.hrbp.domain.recruit.mapper.RecruitCandidateMapper;
import com.hrbp.domain.recruit.mapper.RecruitDemandMapper;
import com.hrbp.domain.recruit.mapper.RecruitOfferMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecruitDashboardService {
    private final RecruitDemandMapper demandMapper;
    private final RecruitApplicationMapper applicationMapper;
    private final RecruitCandidateMapper candidateMapper;
    private final RecruitOfferMapper offerMapper;

    /** KPI 指标卡 */
    public Map<String, Object> kpi() {
        List<RecruitDemand> all = demandMapper.selectList(null);
        int headcount = all.stream().mapToInt(d -> d.getHeadcount() == null ? 0 : d.getHeadcount()).sum();
        int arrived = all.stream().mapToInt(d -> d.getArrived() == null ? 0 : d.getArrived()).sum();
        long recruiting = all.stream().filter(d -> "招聘中".equals(d.getDemandStatus())).count();
        long finished = all.stream().filter(d -> "已完成".equals(d.getDemandStatus())).count();
        Map<String, Object> m = new HashMap<>();
        m.put("demandTotal", all.size());
        m.put("recruiting", recruiting);
        m.put("finished", finished);
        m.put("headcountTotal", headcount);
        m.put("arrivedTotal", arrived);
        m.put("arriveRate", headcount == 0 ? 0 : Math.round(arrived * 1000.0 / headcount) / 10.0);
        m.put("candidateTotal", candidateMapper.selectCount(null));
        m.put("offerTotal", offerMapper.selectCount(null));
        long accepted = offerMapper.selectCount(new LambdaQueryWrapper<RecruitOffer>().in(RecruitOffer::getOfferStatus, "已接受", "已入职"));
        long sent = offerMapper.selectCount(new LambdaQueryWrapper<RecruitOffer>().in(RecruitOffer::getOfferStatus, "已发送", "已接受", "已拒绝", "已入职"));
        m.put("offerAcceptRate", sent == 0 ? 0 : Math.round(accepted * 1000.0 / sent) / 10.0);
        return m;
    }

    /** 招聘进度：按需求 */
    public List<Map<String, Object>> progress() {
        return demandMapper.selectList(new LambdaQueryWrapper<RecruitDemand>()
                        .in(RecruitDemand::getDemandStatus, "招聘中", "已完成"))
                .stream().map(d -> {
                    Map<String, Object> m = new LinkedHashMap<String, Object>();
                    m.put("demandNo", d.getDemandNo());
                    m.put("positionName", d.getPositionName());
                    m.put("headcount", d.getHeadcount());
                    m.put("arrived", d.getArrived());
                    m.put("rate", d.getHeadcount() == 0 ? 0 : Math.round(d.getArrived() * 1000.0 / d.getHeadcount()) / 10.0);
                    return m;
                }).toList();
    }

    /** 招聘漏斗：投递→筛选→初试→复试→终试→Offer→入职 */
    public List<Map<String, Object>> funnel() {
        List<RecruitApplication> all = applicationMapper.selectList(null);
        String[] stages = {"待筛选", "已筛选", "初试", "复试", "终试", "Offer", "待入职", "已入职"};
        List<Map<String, Object>> result = new ArrayList<>();
        // 到达过各阶段的人数（含后续阶段）
        Map<String, Integer> order = new HashMap<>();
        for (int i = 0; i < stages.length; i++) order.put(stages[i], i);
        for (String stage : stages) {
            int idx = order.get(stage);
            long count = all.stream().filter(a -> {
                Integer cur = order.get(a.getApplyStatus());
                if (cur == null) {
                    return "已淘汰".equals(a.getApplyStatus()) || "已放弃".equals(a.getApplyStatus())
                            ? idx <= furthestStage(a, order) : false;
                }
                return cur >= idx || "已淘汰".equals(a.getApplyStatus()) || "已放弃".equals(a.getApplyStatus())
                        ? reachedStage(a, idx, order) : cur >= idx;
            }).count();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("stage", stage);
            m.put("count", count);
            result.add(m);
        }
        return result;
    }

    private boolean reachedStage(RecruitApplication a, int idx, Map<String, Integer> order) {
        // 淘汰/放弃人员：按其面试结果判断最远到达阶段
        return idx <= furthestStage(a, order);
    }

    private int furthestStage(RecruitApplication a, Map<String, Integer> order) {
        int s = order.get("待筛选");
        if (a.getFirstResult() != null) s = order.get("复试");
        if (a.getSecondResult() != null) s = order.get("终试");
        if (a.getFinalResult() != null) s = order.get("Offer");
        return s;
    }

    /** 渠道效果：按来源渠道统计应聘者与转化 */
    public List<Map<String, Object>> channel() {
        List<RecruitCandidate> candidates = candidateMapper.selectList(null);
        List<RecruitApplication> apps = applicationMapper.selectList(null);
        Map<Long, String> candChannel = candidates.stream()
                .collect(Collectors.toMap(RecruitCandidate::getId, c -> c.getSourceChannel() == null ? "未知" : c.getSourceChannel()));
        Map<String, List<RecruitCandidate>> byChannel = candidates.stream()
                .collect(Collectors.groupingBy(c -> c.getSourceChannel() == null ? "未知" : c.getSourceChannel()));
        List<Map<String, Object>> result = new ArrayList<>();
        byChannel.forEach((ch, list) -> {
            long applied = apps.stream().filter(a -> ch.equals(candChannel.get(a.getCandidateId()))).count();
            long hired = apps.stream().filter(a -> ch.equals(candChannel.get(a.getCandidateId())) && a.getIsHired() != null && a.getIsHired() == 1).count();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("channel", ch);
            m.put("candidates", list.size());
            m.put("applications", applied);
            m.put("hired", hired);
            result.add(m);
        });
        result.sort((a, b) -> Integer.compare((Integer) b.get("candidates"), (Integer) a.get("candidates")));
        return result;
    }

    /** Offer 分析：状态分布与流失 */
    public Map<String, Object> offerAnalysis() {
        List<RecruitOffer> all = offerMapper.selectList(null);
        Map<String, Long> byStatus = all.stream().collect(Collectors.groupingBy(RecruitOffer::getOfferStatus, Collectors.counting()));
        long lost = all.stream().filter(o -> "已拒绝".equals(o.getOfferStatus()) || "已失效".equals(o.getOfferStatus())).count();
        Map<String, Object> m = new HashMap<>();
        m.put("byStatus", byStatus);
        m.put("lost", lost);
        m.put("total", all.size());
        // 平均年包（万元）
        double avg = all.stream().filter(o -> o.getAnnualPackage() != null)
                .mapToDouble(o -> o.getAnnualPackage().doubleValue() / 10000).average().orElse(0);
        m.put("avgPackage", Math.round(avg * 10) / 10.0);
        return m;
    }

    /** 时效：招聘中需求的平均招聘天数与超期 */
    public Map<String, Object> efficiency() {
        List<RecruitDemand> recruiting = demandMapper.selectList(new LambdaQueryWrapper<RecruitDemand>()
                .eq(RecruitDemand::getDemandStatus, "招聘中"));
        double avgDays = recruiting.stream()
                .mapToLong(d -> d.getCreateTime() == null ? 0 : ChronoUnit.DAYS.between(d.getCreateTime().toLocalDate(), LocalDate.now()))
                .average().orElse(0);
        long overdue = recruiting.stream().filter(d -> {
            int gap = d.getHeadcount() - (d.getArrived() == null ? 0 : d.getArrived());
            return d.getExpectDate() != null && d.getExpectDate().isBefore(LocalDate.now()) && gap > 0;
        }).count();
        Map<String, Object> m = new HashMap<>();
        m.put("avgRecruitDays", Math.round(avgDays * 10) / 10.0);
        m.put("overdueDemands", overdue);
        return m;
    }
}
