package com.hrbp.domain.employee.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hrbp.domain.employee.entity.EmpEmployee;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface EmpEmployeeMapper extends BaseMapper<EmpEmployee> {
}
