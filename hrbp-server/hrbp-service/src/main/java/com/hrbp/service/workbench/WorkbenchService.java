package com.hrbp.service.workbench;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrbp.domain.att.mapper.AttLeaveMapper;
import com.hrbp.domain.employee.mapper.EmpEmployeeMapper;
import com.hrbp.domain.est.entity.EstLine;
import com.hrbp.domain.est.mapper.EstLineMapper;
import com.hrbp.domain.flow.entity.CtrContract;
import com.hrbp.domain.flow.entity.ObOnboarding;
import com.hrbp.domain.flow.entity.RegRegularization;
import com.hrbp.domain.flow.mapper.CtrContractMapper;
import com.hrbp.domain.flow.mapper.MvMovementMapper;
import com.hrbp.domain.flow.mapper.ObOnboardingMapper;
import com.hrbp.domain.flow.mapper.OffOffboardingMapper;
import com.hrbp.domain.flow.mapper.RegRegularizationMapper;
import com.hrbp.domain.recruit.entity.RecruitDemand;
import com.hrbp.domain.recruit.mapper.RecruitDemandMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 工作台聚合（派生视图，不落业务实体） */
@Service
@RequiredArgsConstructor
public class WorkbenchService {
    private final RecruitDemandMapper demandMapper;
    private final ObOnboardingMapper onboardingMapper;
    private final RegRegularizationMapper regMapper;
    private final MvMovementMapper movementMapper;
    private final OffOffboardingMapper offboardingMapper;
    private final CtrContractMapper contractMapper;
    private final EstLineMapper estLineMapper;
    private final EmpEmployeeMapper employeeMapper;
    private final AttLeaveMapper leaveMapper;

    /** 待办卡：各模块待处理计数 */
    public List<Map<String, Object>> todos() {
        List<Map<String, Object>> cards = new ArrayList<>();
        cards.add(card("招聘需求审批", demandMapper.selectCount(new LambdaQueryWrapper<RecruitDemand>().eq(RecruitDemand::getDemandStatus, "待审批")), "/hr/recruit/demand/list"));
        cards.add(card("入职待确认", onboardingMapper.selectCount(new LambdaQueryWrapper<ObOnboarding>().eq(ObOnboarding::getDocStatus, "待入职")), "/hr/onboarding/list"));
        cards.add(card("转正待评估", regMapper.selectCount(new LambdaQueryWrapper<RegRegularization>().in(RegRegularization::getDocStatus, "待评估", "待审批")), "/hr/regularization/list"));
        cards.add(card("异动待审批", movementMapper.selectCount(new LambdaQueryWrapper<com.hrbp.domain.flow.entity.MvMovement>().in(com.hrbp.domain.flow.entity.MvMovement::getDocStatus, "待审批", "待生效")), "/hr/movement/list"));
        cards.add(card("离职待审批", offboardingMapper.selectCount(new LambdaQueryWrapper<com.hrbp.domain.flow.entity.OffOffboarding>().in(com.hrbp.domain.flow.entity.OffOffboarding::getDocStatus, "待审批", "待确认")), "/hr/offboarding/list"));
        cards.add(card("合同待签订", contractMapper.selectCount(new LambdaQueryWrapper<CtrContract>().eq(CtrContract::getStatus, "待签订")), "/hr/contract/list"));
        cards.add(card("编制待审批", estLineMapper.selectCount(new LambdaQueryWrapper<EstLine>().eq(EstLine::getEstStatus, "待审批")), "/hr/establishment/list"));
        cards.add(card("假勤待审批", leaveMapper.selectCount(new LambdaQueryWrapper<com.hrbp.domain.att.entity.AttLeave>().eq(com.hrbp.domain.att.entity.AttLeave::getApproveStatus, "待审批")), "/hr/attendance/list"));
        return cards;
    }

    /** 预警卡：合同到期/试用期到期/超编/招聘超期 */
    public List<Map<String, Object>> alerts() {
        List<Map<String, Object>> result = new ArrayList<>();
        // 合同 30 天内到期
        List<CtrContract> expiring = contractMapper.selectList(new LambdaQueryWrapper<CtrContract>()
                .eq(CtrContract::getStatus, "生效中").isNotNull(CtrContract::getEndDate)
                .between(CtrContract::getEndDate, LocalDate.now(), LocalDate.now().plusDays(30)));
        expiring.forEach(c -> result.add(alert("高", "合同到期", c.getEmpName() + " 合同 " + c.getEndDate() + " 到期", "/hr/contract/list")));
        // 试用期 7 天内到期
        List<RegRegularization> trialDue = regMapper.selectList(new LambdaQueryWrapper<RegRegularization>()
                .in(RegRegularization::getDocStatus, "待评估", "待审批")
                .between(RegRegularization::getTrialEnd, LocalDate.now(), LocalDate.now().plusDays(7)));
        trialDue.forEach(r -> result.add(alert("高", "试用期到期", r.getEmpName() + " 试用期 " + r.getTrialEnd() + " 到期", "/hr/regularization/list")));
        // 超编
        List<EstLine> lines = estLineMapper.selectList(new LambdaQueryWrapper<EstLine>().eq(EstLine::getEstStatus, "生效中"));
        lines.stream().filter(l -> (l.getQuota() == null ? 0 : l.getQuota()) - (l.getIncumbent() == null ? 0 : l.getIncumbent()) - (l.getRecruitHold() == null ? 0 : l.getRecruitHold()) < 0)
                .forEach(l -> result.add(alert("中", "编制超编", l.getEstNo() + " " + l.getPositionName() + " 超编", "/hr/establishment/list")));
        // 招聘超期（期望到岗已过且缺口>0）
        List<RecruitDemand> overdue = demandMapper.selectList(new LambdaQueryWrapper<RecruitDemand>()
                .eq(RecruitDemand::getDemandStatus, "招聘中")
                .lt(RecruitDemand::getExpectDate, LocalDate.now()));
        overdue.stream().filter(d -> d.getHeadcount() - (d.getArrived() == null ? 0 : d.getArrived()) > 0)
                .forEach(d -> result.add(alert("高", "招聘超期", d.getDemandNo() + " " + d.getPositionName() + " 已过期望到岗日", "/hr/recruit/demand/list")));
        return result;
    }

    /** 数据卡：在编人数/可用缺额/在招需求/本月入离职 */
    public Map<String, Object> overview() {
        Map<String, Object> m = new HashMap<>();
        m.put("activeEmployees", employeeMapper.selectCount(new LambdaQueryWrapper<com.hrbp.domain.employee.entity.EmpEmployee>().eq(com.hrbp.domain.employee.entity.EmpEmployee::getEmpStatus, "在职")));
        List<EstLine> lines = estLineMapper.selectList(new LambdaQueryWrapper<EstLine>().eq(EstLine::getEstStatus, "生效中"));
        int vacancy = lines.stream().mapToInt(l -> (l.getQuota() == null ? 0 : l.getQuota()) - (l.getIncumbent() == null ? 0 : l.getIncumbent()) - (l.getRecruitHold() == null ? 0 : l.getRecruitHold())).sum();
        m.put("vacancyTotal", vacancy);
        m.put("recruitingDemands", demandMapper.selectCount(new LambdaQueryWrapper<RecruitDemand>().eq(RecruitDemand::getDemandStatus, "招聘中")));
        String monthStart = LocalDate.now().withDayOfMonth(1).toString();
        m.put("monthHired", employeeMapper.selectCount(new LambdaQueryWrapper<com.hrbp.domain.employee.entity.EmpEmployee>().ge(com.hrbp.domain.employee.entity.EmpEmployee::getHireDate, monthStart)));
        m.put("monthOffboard", offboardingMapper.selectCount(new LambdaQueryWrapper<com.hrbp.domain.flow.entity.OffOffboarding>().eq(com.hrbp.domain.flow.entity.OffOffboarding::getDocStatus, "已离职").ge(com.hrbp.domain.flow.entity.OffOffboarding::getUpdateTime, monthStart)));
        return m;
    }

    private Map<String, Object> card(String label, long count, String path) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", label);
        m.put("count", count);
        m.put("path", path);
        return m;
    }

    private Map<String, Object> alert(String level, String type, String content, String path) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("level", level);
        m.put("type", type);
        m.put("content", content);
        m.put("path", path);
        return m;
    }
}
