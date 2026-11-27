package com.hrbp.service.flow;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hrbp.common.core.BizException;
import com.hrbp.common.core.PageResult;
import com.hrbp.domain.employee.entity.EmpEmployee;
import com.hrbp.domain.employee.entity.EmpJobRecord;
import com.hrbp.domain.employee.mapper.EmpEmployeeMapper;
import com.hrbp.domain.employee.mapper.EmpJobRecordMapper;
import com.hrbp.domain.flow.entity.*;
import com.hrbp.domain.flow.mapper.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/** 入转调离单据链路服务 */
@Service
@RequiredArgsConstructor
public class TalentFlowService {
    private final ObOnboardingMapper onboardingMapper;
    private final RegRegularizationMapper regMapper;
    private final MvMovementMapper movementMapper;
    private final OffOffboardingMapper offboardingMapper;
    private final CtrContractMapper contractMapper;
    private final EmpEmployeeMapper employeeMapper;
    private final EmpJobRecordMapper jobRecordMapper;
    private final GrowthEventService growthService;

    // ==================== 入职 ====================
    public PageResult<ObOnboarding> onboardingPage(String docStatus, String keyword, long pageNum, long pageSize) {
        LambdaQueryWrapper<ObOnboarding> qw = new LambdaQueryWrapper<>();
        if (docStatus != null && !docStatus.isBlank()) qw.eq(ObOnboarding::getDocStatus, docStatus);
        if (keyword != null && !keyword.isBlank()) qw.like(ObOnboarding::getEmpName, keyword);
        qw.orderByAsc(ObOnboarding::getPlanDate);
        return PageResult.of(onboardingMapper.selectPage(new Page<>(pageNum, pageSize), qw));
    }

    /** 确认入职四前置：计划日期≤今天 + 采集已提交 + 材料已交齐 */
    @Transactional
    public void confirmOnboarding(Long id) {
        ObOnboarding ob = mustGetOnboarding(id);
        if (!"待入职".equals(ob.getDocStatus())) throw new BizException("当前状态不可确认入职");
        if (ob.getPlanDate().isAfter(LocalDate.now())) throw new BizException("计划入职日期未到");
        if (!"已提交".equals(ob.getCollectStatus())) throw new BizException("信息采集未提交");
        if (!"已交齐".equals(ob.getMaterialStatus())) throw new BizException("入职材料未交齐");

        // 1. 生成员工档案（仅一次）
        EmpEmployee emp = new EmpEmployee();
        emp.setEmpNo(nextEmpNo());
        emp.setEmpName(ob.getEmpName());
        emp.setPhone(ob.getPhone());
        emp.setDeptId(ob.getDeptId());
        emp.setPositionName(ob.getPositionName());
        emp.setJobLevel(ob.getJobLevel());
        emp.setHireDate(LocalDate.now());
        emp.setEmpStatus("在职");
        employeeMapper.insert(emp);

        // 2. 任职记录
        EmpJobRecord rec = new EmpJobRecord();
        rec.setEmpId(emp.getId());
        rec.setDeptId(ob.getDeptId());
        rec.setDeptName(ob.getDeptName());
        rec.setPositionName(ob.getPositionName());
        rec.setRecordType("新入职");
        rec.setStartDate(LocalDate.now());
        rec.setIsCurrent(1);
        jobRecordMapper.insert(rec);

        // 3. 待签订合同
        CtrContract ctr = new CtrContract();
        ctr.setContractNo("HT-" + LocalDate.now().getYear() + "-" + emp.getEmpNo() + "-01");
        ctr.setEmpId(emp.getId());
        ctr.setEmpName(emp.getEmpName());
        ctr.setContractType("固定期限");
        ctr.setStartDate(LocalDate.now());
        ctr.setEndDate(LocalDate.now().plusYears(3).minusDays(1));
        ctr.setStatus("待签订");
        ctr.setSourceType("入职生成");
        contractMapper.insert(ctr);

        // 4. 生成转正单（默认试用期 3 个月）
        RegRegularization reg = new RegRegularization();
        reg.setRegNo(nextNo("RG"));
        reg.setOnboardNo(ob.getOnboardNo());
        reg.setEmpId(emp.getId());
        reg.setEmpName(emp.getEmpName());
        reg.setDeptName(ob.getDeptName());
        reg.setPositionName(ob.getPositionName());
        reg.setJobLevel(ob.getJobLevel());
        reg.setTrialStart(LocalDate.now());
        reg.setTrialEnd(LocalDate.now().plusMonths(3));
        reg.setTrialMonths(3);
        reg.setDocStatus("待评估");
        regMapper.insert(reg);

        // 5. 成长事件
        growthService.emit(emp.getId(), emp.getEmpNo(), emp.getEmpName(), "入职", LocalDate.now(),
                ob.getEmpName() + "入职", "入职" + ob.getDeptName() + "，" + ob.getPositionName() + " " + ob.getJobLevel(),
                "入职管理", ob.getOnboardNo(), 1);

        ob.setDocStatus("已入职");
        ob.setOnboardResult("已到岗");
        ob.setActualDate(LocalDate.now());
        ob.setEmpId(emp.getId());
        onboardingMapper.updateById(ob);
    }

    @Transactional
    public void absentOnboarding(Long id, String reason) {
        ObOnboarding ob = mustGetOnboarding(id);
        if (!"待入职".equals(ob.getDocStatus())) throw new BizException("当前状态不可标记");
        ob.setDocStatus("未到岗");
        ob.setOnboardResult("未到岗");
        ob.setRemark(reason);
        onboardingMapper.updateById(ob);
    }

    @Transactional
    public ObOnboarding createOnboarding(ObOnboarding ob) {
        ob.setOnboardNo(nextNo("OB"));
        ob.setDocStatus("待入职");
        ob.setOnboardResult("待到岗");
        if (ob.getCollectStatus() == null) ob.setCollectStatus("未发送");
        if (ob.getMaterialStatus() == null) ob.setMaterialStatus("未提交");
        onboardingMapper.insert(ob);
        return ob;
    }

    // ==================== 转正 ====================
    public PageResult<RegRegularization> regPage(String docStatus, String keyword, long pageNum, long pageSize) {
        LambdaQueryWrapper<RegRegularization> qw = new LambdaQueryWrapper<>();
        if (docStatus != null && !docStatus.isBlank()) qw.eq(RegRegularization::getDocStatus, docStatus);
        if (keyword != null && !keyword.isBlank()) qw.like(RegRegularization::getEmpName, keyword);
        qw.orderByAsc(RegRegularization::getTrialEnd);
        return PageResult.of(regMapper.selectPage(new Page<>(pageNum, pageSize), qw));
    }

    /** 提交评估 */
    @Transactional
    public void submitRegEval(Long id, java.math.BigDecimal score, String conclusion) {
        RegRegularization reg = mustGetReg(id);
        if (!"待评估".equals(reg.getDocStatus())) throw new BizException("当前状态不可评估");
        reg.setEvalScore(score);
        reg.setEvalConclusion(conclusion);
        reg.setDocStatus("待审批");
        regMapper.updateById(reg);
    }

    /** 审批：通过→已转正回写员工转正日期；延期→已延期；不通过→未通过（终态） */
    @Transactional
    public void approveReg(Long id, boolean pass) {
        RegRegularization reg = mustGetReg(id);
        if (!"待审批".equals(reg.getDocStatus())) throw new BizException("当前状态不可审批");
        if (pass && "通过".equals(reg.getEvalConclusion())) {
            reg.setDocStatus("已转正");
            reg.setActualDate(LocalDate.now());
            EmpEmployee emp = employeeMapper.selectById(reg.getEmpId());
            emp.setRegularDate(LocalDate.now());
            employeeMapper.updateById(emp);
            growthService.emit(reg.getEmpId(), emp.getEmpNo(), reg.getEmpName(), "转正", LocalDate.now(),
                    reg.getEmpName() + "转正", "试用期评估 " + reg.getEvalScore() + " 分，按期转正",
                    "转正管理", reg.getRegNo(), 1);
        } else if (pass && "延期".equals(reg.getEvalConclusion())) {
            // 延期一次为限且总试用期 ≤6 个月
            if (reg.getTrialMonths() >= 6) throw new BizException("总试用期已达 6 个月上限，不可延期");
            reg.setDocStatus("已延期");
            reg.setTrialEnd(reg.getTrialEnd().plusMonths(2));
            reg.setTrialMonths(reg.getTrialMonths() + 2);
            growthService.emit(reg.getEmpId(), null, reg.getEmpName(), "转正延期", LocalDate.now(),
                    reg.getEmpName() + "转正延期", "试用期延期 2 个月", "转正管理", reg.getRegNo(), 1);
        } else {
            reg.setDocStatus("未通过");
            growthService.emit(reg.getEmpId(), null, reg.getEmpName(), "转正未通过", LocalDate.now(),
                    reg.getEmpName() + "试用期未通过", "评估结论不通过", "转正管理", reg.getRegNo(), 1);
        }
        regMapper.updateById(reg);
    }

    // ==================== 异动 ====================
    public PageResult<MvMovement> movementPage(String docStatus, long pageNum, long pageSize) {
        LambdaQueryWrapper<MvMovement> qw = new LambdaQueryWrapper<>();
        if (docStatus != null && !docStatus.isBlank()) qw.eq(MvMovement::getDocStatus, docStatus);
        qw.orderByDesc(MvMovement::getCreateTime);
        return PageResult.of(movementMapper.selectPage(new Page<>(pageNum, pageSize), qw));
    }

    /** 发起异动：类型由职级自动判定 */
    @Transactional
    public MvMovement createMovement(MvMovement mv) {
        EmpEmployee emp = employeeMapper.selectById(mv.getEmpId());
        if (emp == null) throw new BizException("员工不存在");
        if (!"在职".equals(emp.getEmpStatus())) throw new BizException("仅在职员工可发起异动");
        // 进行中单据拦截
        long running = movementMapper.selectCount(new LambdaQueryWrapper<MvMovement>()
                .eq(MvMovement::getEmpId, mv.getEmpId())
                .in(MvMovement::getDocStatus, "草稿", "待审批", "待生效"));
        if (running > 0) throw new BizException("该员工存在进行中的异动单");
        mv.setMvNo(nextNo("MV"));
        mv.setEmpName(emp.getEmpName());
        mv.setFromDept(null);
        mv.setFromPosition(emp.getPositionName());
        mv.setFromLevel(emp.getJobLevel());
        // 类型判定
        mv.setMvType(judgeMvType(emp.getJobLevel(), mv.getToLevel()));
        mv.setDocStatus("草稿");
        movementMapper.insert(mv);
        return mv;
    }

    private String judgeMvType(String fromLevel, String toLevel) {
        if (fromLevel == null || toLevel == null || fromLevel.equals(toLevel)) return "调岗";
        int from = levelRank(fromLevel), to = levelRank(toLevel);
        return to > from ? "晋升" : (to < from ? "降职" : "调岗");
    }

    private int levelRank(String code) {
        try {
            return Integer.parseInt(code.replaceAll("\\D", ""));
        } catch (Exception e) {
            return 0;
        }
    }

    @Transactional
    public void submitMovement(Long id) {
        MvMovement mv = mustGetMovement(id);
        if (!"草稿".equals(mv.getDocStatus())) throw new BizException("仅草稿可提交");
        mv.setDocStatus("待审批");
        movementMapper.updateById(mv);
    }

    @Transactional
    public void approveMovement(Long id, boolean pass) {
        MvMovement mv = mustGetMovement(id);
        if (!"待审批".equals(mv.getDocStatus())) throw new BizException("当前状态不可审批");
        if (!pass) {
            mv.setDocStatus("已驳回");
        } else {
            // 生效日晚于今天则待生效，否则立即生效
            if (mv.getEffectiveDate().isAfter(LocalDate.now())) {
                mv.setDocStatus("待生效");
            } else {
                mv.setDocStatus("待生效");
                applyMovement(mv);
            }
        }
        movementMapper.updateById(mv);
    }

    /** 生效执行（定时/手动触发） */
    @Transactional
    public void applyMovement(MvMovement mv) {
        EmpEmployee emp = employeeMapper.selectById(mv.getEmpId());
        // 结束原任职
        EmpJobRecord current = jobRecordMapper.selectOne(new LambdaQueryWrapper<EmpJobRecord>()
                .eq(EmpJobRecord::getEmpId, mv.getEmpId()).eq(EmpJobRecord::getIsCurrent, 1));
        if (current != null) {
            current.setIsCurrent(0);
            current.setEndDate(mv.getEffectiveDate().minusDays(1));
            jobRecordMapper.updateById(current);
        }
        // 新任职
        EmpJobRecord rec = new EmpJobRecord();
        rec.setEmpId(mv.getEmpId());
        rec.setDeptId(mv.getToDeptId());
        rec.setDeptName(mv.getToDept());
        rec.setPositionName(mv.getToPosition());
        rec.setRecordType(mv.getMvType());
        rec.setStartDate(mv.getEffectiveDate());
        rec.setIsCurrent(1);
        jobRecordMapper.insert(rec);
        // 回写员工
        emp.setDeptId(mv.getToDeptId());
        emp.setPositionName(mv.getToPosition());
        emp.setJobLevel(mv.getToLevel());
        employeeMapper.updateById(emp);
        growthService.emit(mv.getEmpId(), emp.getEmpNo(), mv.getEmpName(), mv.getMvType(), mv.getEffectiveDate(),
                mv.getEmpName() + mv.getMvType(), mv.getFromPosition() + " " + mv.getFromLevel() + " → " + mv.getToPosition() + " " + mv.getToLevel(),
                "调岗晋升", mv.getMvNo(), 1);
        mv.setDocStatus("已生效");
        movementMapper.updateById(mv);
    }

    @Transactional
    public int applyDueMovements() {
        List<MvMovement> due = movementMapper.selectList(new LambdaQueryWrapper<MvMovement>()
                .eq(MvMovement::getDocStatus, "待生效")
                .le(MvMovement::getEffectiveDate, LocalDate.now()));
        due.forEach(this::applyMovement);
        return due.size();
    }

    // ==================== 离职 ====================
    public PageResult<OffOffboarding> offboardingPage(String docStatus, long pageNum, long pageSize) {
        LambdaQueryWrapper<OffOffboarding> qw = new LambdaQueryWrapper<>();
        if (docStatus != null && !docStatus.isBlank()) qw.eq(OffOffboarding::getDocStatus, docStatus);
        qw.orderByDesc(OffOffboarding::getCreateTime);
        return PageResult.of(offboardingMapper.selectPage(new Page<>(pageNum, pageSize), qw));
    }

    @Transactional
    public OffOffboarding createOffboarding(OffOffboarding off) {
        EmpEmployee emp = employeeMapper.selectById(off.getEmpId());
        if (emp == null || !"在职".equals(emp.getEmpStatus())) throw new BizException("仅在职员工可发起离职");
        long running = offboardingMapper.selectCount(new LambdaQueryWrapper<OffOffboarding>()
                .eq(OffOffboarding::getEmpId, off.getEmpId())
                .in(OffOffboarding::getDocStatus, "草稿", "待审批", "待离职", "待确认"));
        if (running > 0) throw new BizException("该员工存在进行中的离职单");
        off.setOffNo(nextNo("OB"));
        off.setEmpName(emp.getEmpName());
        off.setPositionName(emp.getPositionName());
        off.setDocStatus("草稿");
        off.setHandoverStatus("待交接");
        offboardingMapper.insert(off);
        return off;
    }

    @Transactional
    public void submitOffboarding(Long id) {
        OffOffboarding off = mustGetOff(id);
        if (!"草稿".equals(off.getDocStatus())) throw new BizException("仅草稿可提交");
        off.setDocStatus("待审批");
        offboardingMapper.updateById(off);
    }

    @Transactional
    public void approveOffboarding(Long id, boolean pass) {
        OffOffboarding off = mustGetOff(id);
        if (!"待审批".equals(off.getDocStatus())) throw new BizException("当前状态不可审批");
        off.setDocStatus(pass ? "待离职" : "已撤销");
        offboardingMapper.updateById(off);
    }

    /** 确认离职四前置：审批通过 + 最后工作日≤今天 + 交接完成 */
    @Transactional
    public void confirmOffboarding(Long id) {
        OffOffboarding off = mustGetOff(id);
        if (!"待离职".equals(off.getDocStatus()) && !"待确认".equals(off.getDocStatus())) {
            throw new BizException("当前状态不可确认离职");
        }
        if (off.getLastWorkDate().isAfter(LocalDate.now())) throw new BizException("最后工作日未到");
        if (!"已完成".equals(off.getHandoverStatus())) throw new BizException("交接事项未完成");
        // 进行中异动拦截
        long mvRunning = movementMapper.selectCount(new LambdaQueryWrapper<MvMovement>()
                .eq(MvMovement::getEmpId, off.getEmpId())
                .in(MvMovement::getDocStatus, "草稿", "待审批", "待生效"));
        if (mvRunning > 0) throw new BizException("存在进行中的异动单");

        EmpEmployee emp = employeeMapper.selectById(off.getEmpId());
        emp.setEmpStatus("离职");
        employeeMapper.updateById(emp);
        // 结束任职
        EmpJobRecord current = jobRecordMapper.selectOne(new LambdaQueryWrapper<EmpJobRecord>()
                .eq(EmpJobRecord::getEmpId, off.getEmpId()).eq(EmpJobRecord::getIsCurrent, 1));
        if (current != null) {
            current.setIsCurrent(0);
            current.setEndDate(off.getLastWorkDate());
            jobRecordMapper.updateById(current);
        }
        // 生成合同解除待办（生效中合同标记解除）
        List<CtrContract> active = contractMapper.selectList(new LambdaQueryWrapper<CtrContract>()
                .eq(CtrContract::getEmpId, off.getEmpId()).eq(CtrContract::getStatus, "生效中"));
        for (CtrContract c : active) {
            c.setStatus("已解除");
            c.setReleaseDate(off.getLastWorkDate());
            c.setReleaseReason("离职解除：" + off.getOffType());
            contractMapper.updateById(c);
            growthService.emit(off.getEmpId(), emp.getEmpNo(), off.getEmpName(), "合同解除", off.getLastWorkDate(),
                    off.getEmpName() + "合同解除", c.getContractNo() + " 因离职解除", "合同管理", c.getContractNo(), 1);
        }
        growthService.emit(off.getEmpId(), emp.getEmpNo(), off.getEmpName(), "离职", off.getLastWorkDate(),
                off.getEmpName() + "离职", off.getOffType() + "：" + (off.getOffReason() == null ? "" : off.getOffReason()),
                "离职管理", off.getOffNo(), 1);
        off.setDocStatus("已离职");
        offboardingMapper.updateById(off);
    }

    @Transactional
    public void updateHandover(Long id, String handoverStatus) {
        OffOffboarding off = mustGetOff(id);
        off.setHandoverStatus(handoverStatus);
        if ("待离职".equals(off.getDocStatus()) && off.getLastWorkDate().isBefore(LocalDate.now().plusDays(1))) {
            off.setDocStatus("待确认");
        }
        offboardingMapper.updateById(off);
    }

    // ==================== 合同 ====================
    public PageResult<CtrContract> contractPage(String status, String keyword, long pageNum, long pageSize) {
        LambdaQueryWrapper<CtrContract> qw = new LambdaQueryWrapper<>();
        if (status != null && !status.isBlank()) qw.eq(CtrContract::getStatus, status);
        if (keyword != null && !keyword.isBlank()) {
            qw.and(w -> w.like(CtrContract::getEmpName, keyword).or().like(CtrContract::getContractNo, keyword));
        }
        qw.orderByAsc(CtrContract::getEndDate);
        return PageResult.of(contractMapper.selectPage(new Page<>(pageNum, pageSize), qw));
    }

    @Transactional
    public void signContract(Long id) {
        CtrContract c = mustGetContract(id);
        if (!"待签订".equals(c.getStatus())) throw new BizException("当前状态不可签订");
        c.setSignDate(LocalDate.now());
        c.setStatus(c.getStartDate().isAfter(LocalDate.now()) ? "待生效" : "生效中");
        contractMapper.updateById(c);
        EmpEmployee emp = employeeMapper.selectById(c.getEmpId());
        growthService.emit(c.getEmpId(), emp == null ? null : emp.getEmpNo(), c.getEmpName(), "合同签订", LocalDate.now(),
                c.getEmpName() + "合同签订", c.getContractNo() + " " + c.getContractType(), "合同管理", c.getContractNo(), 1);
    }

    /** 续签：原合同→已续签，新合同生效中 */
    @Transactional
    public CtrContract renewContract(Long id, LocalDate newEndDate) {
        CtrContract old = mustGetContract(id);
        if (!"生效中".equals(old.getStatus())) throw new BizException("仅生效中合同可续签");
        old.setStatus("已续签");
        contractMapper.updateById(old);
        CtrContract neo = new CtrContract();
        neo.setContractNo(old.getContractNo().replaceAll("-\\d+$", "") + "-" + String.format("%02d",
                contractMapper.selectCount(new LambdaQueryWrapper<CtrContract>().eq(CtrContract::getEmpId, old.getEmpId())).intValue() + 1));
        neo.setEmpId(old.getEmpId());
        neo.setEmpName(old.getEmpName());
        neo.setContractType(old.getContractType());
        neo.setSignDate(LocalDate.now());
        neo.setStartDate(old.getEndDate() == null ? LocalDate.now() : old.getEndDate().plusDays(1));
        neo.setEndDate(newEndDate);
        neo.setStatus("生效中");
        neo.setSourceType("续签生成");
        neo.setOriginNo(old.getContractNo());
        contractMapper.insert(neo);
        EmpEmployee emp = employeeMapper.selectById(old.getEmpId());
        growthService.emit(old.getEmpId(), emp == null ? null : emp.getEmpNo(), old.getEmpName(), "合同续签", LocalDate.now(),
                old.getEmpName() + "合同续签", old.getContractNo() + " → " + neo.getContractNo(), "合同管理", neo.getContractNo(), 1);
        return neo;
    }

    @Transactional
    public void releaseContract(Long id, String reason) {
        CtrContract c = mustGetContract(id);
        if (!"生效中".equals(c.getStatus())) throw new BizException("仅生效中合同可解除");
        c.setStatus("已解除");
        c.setReleaseDate(LocalDate.now());
        c.setReleaseReason(reason);
        contractMapper.updateById(c);
        growthService.emit(c.getEmpId(), null, c.getEmpName(), "合同解除", LocalDate.now(),
                c.getEmpName() + "合同解除", c.getContractNo() + "：" + reason, "合同管理", c.getContractNo(), 1);
    }

    /** 到期合同扫描：到期未续签自动转已到期 */
    @Transactional
    public int expireDueContracts() {
        List<CtrContract> due = contractMapper.selectList(new LambdaQueryWrapper<CtrContract>()
                .eq(CtrContract::getStatus, "生效中")
                .isNotNull(CtrContract::getEndDate)
                .lt(CtrContract::getEndDate, LocalDate.now()));
        for (CtrContract c : due) {
            c.setStatus("已到期");
            contractMapper.updateById(c);
        }
        return due.size();
    }

    // ==================== 工具 ====================
    private ObOnboarding mustGetOnboarding(Long id) {
        ObOnboarding o = onboardingMapper.selectById(id);
        if (o == null) throw new BizException("入职单不存在");
        return o;
    }

    private RegRegularization mustGetReg(Long id) {
        RegRegularization r = regMapper.selectById(id);
        if (r == null) throw new BizException("转正单不存在");
        return r;
    }

    private MvMovement mustGetMovement(Long id) {
        MvMovement m = movementMapper.selectById(id);
        if (m == null) throw new BizException("异动单不存在");
        return m;
    }

    private OffOffboarding mustGetOff(Long id) {
        OffOffboarding o = offboardingMapper.selectById(id);
        if (o == null) throw new BizException("离职单不存在");
        return o;
    }

    private CtrContract mustGetContract(Long id) {
        CtrContract c = contractMapper.selectById(id);
        if (c == null) throw new BizException("合同不存在");
        return c;
    }

    private String nextNo(String prefix) {
        return prefix + "-" + LocalDate.now().getYear() + "-" + String.format("%04d", System.currentTimeMillis() % 10000);
    }

    private String nextEmpNo() {
        long count = employeeMapper.selectCount(null);
        return String.format("E%04d", count + 1);
    }
}
