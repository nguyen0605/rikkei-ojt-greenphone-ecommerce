package com.re.greenphone.mapper;

import com.re.greenphone.dto.response.WarehouseResponse;
import com.re.greenphone.entity.Warehouse;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface WarehouseMapper {
    WarehouseResponse toResponse(Warehouse warehouse);
}
