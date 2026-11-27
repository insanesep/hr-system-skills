package com.hrbp.service.talent;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hrbp.common.core.BizException;
import com.hrbp.common.core.PageResult;
import com.hrbp.domain.talent.entity.ReviewCycle;
import com.hrbp.domain.talent.entity.ReviewDetail;
import com.hrbp.domain.talent.entity.TalentRecord;
import com.hrbp.domain.talent.mapper.ReviewCycleMapper;
import com.hrbp.domain.talent.mapper.ReviewDetailMapper;
import com.hrbp.domain.talent.mapper.TalentRecordMapper;
import com.hrbp.service.flow.GrowthEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TalentService {
    private final TalentRecordMapper recordMapper;
    private final ReviewCycleMapper cycleMapper;
    private final ReviewDetailMapper detailMapper;
    private final GrowthEventService growthService;

    private static final Map<String, String> TYPE_PREFIX = Map.of(
            "关键信息", "KI", "访谈沟通", "IV", "述职", "RP", "会议观察", "OB", "人才盘点", "TR");

    // ========== 人才信息记录 ==========
    public PageResult<TalentRecord> recordPage(Long empId, String recordType, long pageNum, long pageSize) {
        LambdaQueryWrapper<TalentRecord> qw = new LambdaQueryWrapper<>();
        if (empId != null) qw.eq(TalentRecord::getEmpId, empId);
        if (recordType != null && !recordType.isBlank()) qw.eq(TalentRecord::getRecordType, recordType);
        qw.orderByDesc(TalentRecord::getCreateTime);
        return PageResult.of(recordMapper.selectPage(new Page<>(pageNum, pageSize), qw));
    }

    public List<TalentRecord> recordHistory(String recordNo) {
        return recordMapper.selectList(new LambdaQueryWrapper<TalentRecord>()
                .eq(TalentRecord::getRecordNo, recordNo).orderByDesc(TalentRecord::getVersion));
    }

    @Transactional
    public TalentRecord createRecord(TalentRecord r) {
        String prefix = TYPE_PREFIX.get(r.getRecordType());
        if (prefix == null) throw new BizException("不支持的记录类型");
        long count = recordMapper.selectCount(new LambdaQueryWrapper<TalentRecord>()
                .likeRight(TalentRecord::getRecordNo, prefix + "-" + LocalDate.now().getYear()));
        r.setRecordNo(String.format("%s-%d-%04d", prefix, LocalDate.now().getYear(), count + 1));
        r.setVersion(1);
        r.setStatus("有效");
        recordMapper.insert(r);
        emitGrowth(r, 1);
        return r;
    }

    /** 编辑 = 生成新版本（更正原因必填），旧版本保留 */
    @Transactional
    public TalentRecord editRecord(Long id, String content, String editReason) {
        if (editReason == null || editReason.isBlank()) throw new BizException("更正原因必填");
        TalentRecord old = mustGet(id);
        if (!"有效".equals(old.getStatus())) throw new BizException("已撤销记录不可编辑");
        TalentRecord neo = new TalentRecord();
        neo.setRecordNo(old.getRecordNo());
        neo.setEmpId(old.getEmpId());
        neo.setEmpName(old.getEmpName());
        neo.setRecordType(old.getRecordType());
        neo.setVersion(old.getVersion() + 1);
        neo.setContent(content);
        neo.setRecordDate(LocalDate.now());
        neo.setStatus("有效");
        neo.setEditReason(editReason);
        recordMapper.insert(neo);
        // 旧版本失效
        old.setStatus("已撤销");
        old.setRevokeReason("被 v" + neo.getVersion() + " 更正：" + editReason);
        recordMapper.updateById(old);
        emitGrowth(neo, neo.getVersion());
        return neo;
    }

    @Transactional
    public void revokeRecord(Long id, String reason) {
        if (reason == null || reason.isBlank()) throw new BizException("撤销原因必填");
        TalentRecord r = mustGet(id);
        r.setStatus("已撤销");
        r.setRevokeReason(reason);
        recordMapper.updateById(r);
    }

    private void emitGrowth(TalentRecord r, int version) {
        String eventType = switch (r.getRecordType()) {
            case "访谈沟通" -> "访谈沟通";
            case "述职" -> "述职";
            case "会议观察" -> "会议观察";
            case "人才盘点" -> "人才盘点";
            default -> "关键信息";
        };
        growthService.emit(r.getEmpId(), null, r.getEmpName(), eventType,
                r.getRecordDate() == null ? LocalDate.now() : r.getRecordDate(),
                r.getEmpName() + r.getRecordType() + "记录",
                r.getContent() == null ? "" : (r.getContent().length() > 280 ? r.getContent().substring(0, 280) : r.getContent()),
                "人才信息", r.getRecordNo(), version);
    }

    // ========== 人才盘点九宫格 ==========
    public List<ReviewCycle> listCycles() {
        return cycleMapper.selectList(new LambdaQueryWrapper<ReviewCycle>().orderByDesc(ReviewCycle::getId));
    }

    public List<ReviewDetail> listDetails(Long cycleId) {
        return detailMapper.selectList(new LambdaQueryWrapper<ReviewDetail>()
                .eq(ReviewDetail::getCycleId, cycleId).orderByAsc(ReviewDetail::getId));
    }

    @Transactional
    public void saveDetail(ReviewDetail d) {
        ReviewCycle c = cycleMapper.selectById(d.getCycleId());
        if (c == null) throw new BizException("盘点周期不存在");
        if ("已锁定".equals(c.getStatus())) throw new BizException("周期已锁定，全部只读");
        if (d.getId() == null) {
            long dup = detailMapper.selectCount(new LambdaQueryWrapper<ReviewDetail>()
                    .eq(ReviewDetail::getCycleId, d.getCycleId()).eq(ReviewDetail::getEmpId, d.getEmpId()));
            if (dup > 0) throw new BizException("该员工本周期已有盘点记录");
            detailMapper.insert(d);
        } else {
            detailMapper.updateById(d);
        }
    }

    /** 九宫格汇总：未评估（两轴缺一）不入格 */
    public List<Map<String, Object>> nineBox(Long cycleId) {
        List<ReviewDetail> details = listDetails(cycleId);
        List<Map<String, Object>> grid = new ArrayList<>();
        for (String potential : new String[]{"高", "中", "低"}) {
            for (String match : new String[]{"低", "中", "高"}) {
                List<ReviewDetail> cell = details.stream()
                        .filter(d -> match.equals(d.getMatchLevel()) && potential.equals(d.getPotential()))
                        .toList();
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("potential", potential);
                m.put("match", match);
                m.put("count", cell.size());
                m.put("people", cell.stream().map(ReviewDetail::getEmpName).toList());
                grid.add(m);
            }
        }
        return grid;
    }

    @Transactional
    public void lockCycle(Long cycleId, boolean lock) {
        ReviewCycle c = cycleMapper.selectById(cycleId);
        if (c == null) throw new BizException("周期不存在");
        c.setStatus(lock ? "已锁定" : "进行中");
        cycleMapper.updateById(c);
    }

    private TalentRecord mustGet(Long id) {
        TalentRecord r = recordMapper.selectById(id);
        if (r == null) throw new BizException("记录不存在");
        return r;
    }
}
