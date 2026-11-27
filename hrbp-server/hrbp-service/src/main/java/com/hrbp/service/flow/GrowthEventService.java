package com.hrbp.service.flow;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hrbp.common.core.PageResult;
import com.hrbp.domain.flow.entity.GrowthEvent;
import com.hrbp.domain.flow.mapper.GrowthEventMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
public class GrowthEventService {
    private final GrowthEventMapper eventMapper;
    private final AtomicLong seq = new AtomicLong(System.currentTimeMillis() % 100000);

    /** 幂等写入成长事件：来源单据号+版本+事件类型 */
    public void emit(Long empId, String empNo, String empName, String eventType, LocalDate eventDate,
                     String title, String summary, String sourceModule, String sourceNo, int version) {
        String idemKey = sourceNo + "#" + version + "#" + eventType;
        GrowthEvent e = new GrowthEvent();
        e.setEventNo("EV-" + LocalDate.now().getYear() + "-" + seq.incrementAndGet());
        e.setEmpId(empId);
        e.setEmpNo(empNo);
        e.setEmpName(empName);
        e.setEventType(eventType);
        e.setEventDate(eventDate);
        e.setTitle(title);
        e.setSummary(summary);
        e.setSourceModule(sourceModule);
        e.setSourceNo(sourceNo);
        e.setEventStatus("有效");
        e.setIdemKey(idemKey);
        try {
            eventMapper.insert(e);
        } catch (DuplicateKeyException ignore) {
            // 幂等：重复写入直接忽略
        }
    }

    public PageResult<GrowthEvent> page(Long empId, String eventType, String keyword, long pageNum, long pageSize) {
        LambdaQueryWrapper<GrowthEvent> qw = new LambdaQueryWrapper<>();
        if (empId != null) qw.eq(GrowthEvent::getEmpId, empId);
        if (eventType != null && !eventType.isBlank()) qw.eq(GrowthEvent::getEventType, eventType);
        if (keyword != null && !keyword.isBlank()) {
            qw.and(w -> w.like(GrowthEvent::getEmpName, keyword).or().like(GrowthEvent::getTitle, keyword));
        }
        qw.orderByDesc(GrowthEvent::getEventDate).orderByDesc(GrowthEvent::getCreateTime);
        return PageResult.of(eventMapper.selectPage(new Page<>(pageNum, pageSize), qw));
    }

    public List<GrowthEvent> timeline(Long empId) {
        return eventMapper.selectList(new LambdaQueryWrapper<GrowthEvent>()
                .eq(GrowthEvent::getEmpId, empId)
                .orderByAsc(GrowthEvent::getEventDate));
    }
}
