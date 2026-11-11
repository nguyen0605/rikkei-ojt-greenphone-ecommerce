package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.WarehouseRequest;
import com.re.greenphone.dto.response.WarehouseResponse;
import com.re.greenphone.entity.Warehouse;
import com.re.greenphone.mapper.WarehouseMapper;
import com.re.greenphone.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.SQLException;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminWarehouseService {
    private final WarehouseRepository repository;
    private final WarehouseMapper mapper;

    @Transactional(readOnly = true)
    public List<WarehouseResponse> getAll() {
        return repository.findAll(Sort.by("id")).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public WarehouseResponse getById(Long id) {
        return mapper.toResponse(findWarehouse(id));
    }

    public WarehouseResponse create(WarehouseRequest request) {
        if (repository.existsByCode(request.code())) throw duplicateCode();
        Warehouse warehouse = new Warehouse();
        applyRequest(warehouse, request);
        return mapper.toResponse(save(warehouse));
    }

    public WarehouseResponse update(Long id, WarehouseRequest request) {
        Warehouse warehouse = findWarehouse(id);
        if (repository.existsByCodeAndIdNot(request.code(), id)) throw duplicateCode();
        if (WarehouseStockLedgerService.MAIN_CODE.equals(warehouse.getCode()) && !warehouse.getCode().equals(request.code())) {
            throw new BadRequestException("The main warehouse code cannot be changed");
        }
        applyRequest(warehouse, request);
        return mapper.toResponse(save(warehouse));
    }

    public WarehouseResponse updateStatus(Long id, String status) {
        if (!"ACTIVE".equals(status) && !"INACTIVE".equals(status)) {
            throw new BadRequestException("Invalid warehouse status");
        }
        Warehouse warehouse = findWarehouse(id);
        warehouse.setStatus(status);
        return mapper.toResponse(save(warehouse));
    }

    private Warehouse findWarehouse(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse", "id", id));
    }

    private void applyRequest(Warehouse warehouse, WarehouseRequest request) {
        warehouse.setCode(request.code());
        warehouse.setName(request.name().strip());
        warehouse.setAddress(request.address().strip());
    }

    private Warehouse save(Warehouse warehouse) {
        try {
            // Flush inside the transaction so concurrent duplicate codes also become HTTP 400.
            return repository.saveAndFlush(warehouse);
        } catch (DataIntegrityViolationException ex) {
            for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
                if (cause instanceof SQLException sql && sql.getErrorCode() == 1062
                        && sql.getMessage() != null && sql.getMessage().contains("uq_warehouse_code")) {
                    throw duplicateCode();
                }
            }
            throw ex;
        }
    }

    private BadRequestException duplicateCode() {
        return new BadRequestException("Warehouse code already exists", "WAREHOUSE_CODE_DUPLICATE");
    }
}
