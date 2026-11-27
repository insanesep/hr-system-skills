package com.hrbp.web.controller;

import com.hrbp.common.core.Result;
import com.hrbp.common.security.RequirePerm;
import com.hrbp.domain.org.entity.OrgJobFamily;
import com.hrbp.domain.org.entity.OrgJobLevel;
import com.hrbp.domain.org.entity.OrgPosition;
import com.hrbp.service.org.PositionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/org/position")
@RequiredArgsConstructor
public class PositionController {
    private final PositionService positionService;

    @GetMapping("/level-matrix")
    public Result<Map<String, List<OrgJobLevel>>> levelMatrix() {
        return Result.ok(positionService.levelMatrix());
    }

    @GetMapping("/families")
    public Result<List<OrgJobFamily>> families() {
        return Result.ok(positionService.listFamilies());
    }

    @PostMapping("/families")
    @RequirePerm("BTN:HR_POSITION:SEQUENCE_EDIT")
    public Result<OrgJobFamily> saveFamily(@RequestBody OrgJobFamily family) {
        return Result.ok(positionService.saveFamily(family));
    }

    @GetMapping("/list")
    public Result<List<OrgPosition>> list(@RequestParam(required = false) String keyword,
                                          @RequestParam(required = false) Long familyId,
                                          @RequestParam(required = false) String status) {
        return Result.ok(positionService.listPositions(keyword, familyId, status));
    }

    @PostMapping
    @RequirePerm("BTN:HR_POSITION:STANDARD_CREATE")
    public Result<OrgPosition> create(@RequestBody OrgPosition position) {
        return Result.ok(positionService.savePosition(position));
    }

    @PutMapping
    @RequirePerm("BTN:HR_POSITION:STANDARD_EDIT")
    public Result<OrgPosition> update(@RequestBody OrgPosition position) {
        return Result.ok(positionService.savePosition(position));
    }

    @PostMapping("/{id}/status/{status}")
    @RequirePerm("BTN:HR_POSITION:STANDARD_STATUS")
    public Result<Void> status(@PathVariable Long id, @PathVariable String status) {
        positionService.changePositionStatus(id, status);
        return Result.ok();
    }
}
