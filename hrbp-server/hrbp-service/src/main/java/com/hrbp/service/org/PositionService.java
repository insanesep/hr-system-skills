package com.hrbp.service.org;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrbp.common.core.BizException;
import com.hrbp.domain.org.entity.OrgJobFamily;
import com.hrbp.domain.org.entity.OrgJobLevel;
import com.hrbp.domain.org.entity.OrgPosition;
import com.hrbp.domain.org.mapper.OrgJobFamilyMapper;
import com.hrbp.domain.org.mapper.OrgJobLevelMapper;
import com.hrbp.domain.org.mapper.OrgPositionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PositionService {
    private final OrgJobLevelMapper levelMapper;
    private final OrgJobFamilyMapper familyMapper;
    private final OrgPositionMapper positionMapper;

    /** 职级矩阵：按序列分组 */
    public Map<String, List<OrgJobLevel>> levelMatrix() {
        List<OrgJobLevel> all = levelMapper.selectList(new LambdaQueryWrapper<OrgJobLevel>().orderByAsc(OrgJobLevel::getSeqNo));
        return all.stream().collect(Collectors.groupingBy(OrgJobLevel::getSequence, Collectors.toList()));
    }

    public List<OrgJobFamily> listFamilies() {
        return familyMapper.selectList(new LambdaQueryWrapper<OrgJobFamily>().orderByAsc(OrgJobFamily::getId));
    }

    public OrgJobFamily saveFamily(OrgJobFamily family) {
        if (family.getId() == null) {
            familyMapper.insert(family);
        } else {
            familyMapper.updateById(family);
        }
        return family;
    }

    public List<OrgPosition> listPositions(String keyword, Long familyId, String status) {
        LambdaQueryWrapper<OrgPosition> qw = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            qw.and(w -> w.like(OrgPosition::getPositionName, keyword).or().like(OrgPosition::getPositionCode, keyword));
        }
        if (familyId != null) qw.eq(OrgPosition::getFamilyId, familyId);
        if (status != null && !status.isBlank()) qw.eq(OrgPosition::getStatus, status);
        return positionMapper.selectList(qw.orderByAsc(OrgPosition::getPositionCode));
    }

    public OrgPosition savePosition(OrgPosition position) {
        // 编码唯一
        LambdaQueryWrapper<OrgPosition> qw = new LambdaQueryWrapper<OrgPosition>().eq(OrgPosition::getPositionCode, position.getPositionCode());
        if (position.getId() != null) qw.ne(OrgPosition::getId, position.getId());
        if (positionMapper.selectCount(qw) > 0) throw new BizException("职位编码已存在");
        // 职级范围不跨类别校验
        if (position.getLevelMin() != null && position.getLevelMax() != null) {
            OrgJobLevel min = levelMapper.selectOne(new LambdaQueryWrapper<OrgJobLevel>().eq(OrgJobLevel::getLevelCode, position.getLevelMin()));
            OrgJobLevel max = levelMapper.selectOne(new LambdaQueryWrapper<OrgJobLevel>().eq(OrgJobLevel::getLevelCode, position.getLevelMax()));
            if (min == null || max == null) throw new BizException("职级编码不存在");
            if (!min.getLevelCategory().equals(max.getLevelCategory())) throw new BizException("适用职级范围不可跨职级类别");
        }
        if (position.getId() == null) {
            position.setVersion(1);
            if (position.getStatus() == null) position.setStatus("待启用");
            positionMapper.insert(position);
        } else {
            OrgPosition db = positionMapper.selectById(position.getId());
            position.setVersion((db.getVersion() == null ? 1 : db.getVersion()) + 1);
            positionMapper.updateById(position);
        }
        return position;
    }

    public void changePositionStatus(Long id, String status) {
        OrgPosition db = positionMapper.selectById(id);
        if (db == null) throw new BizException("职位不存在");
        db.setStatus(status);
        positionMapper.updateById(db);
    }
}
