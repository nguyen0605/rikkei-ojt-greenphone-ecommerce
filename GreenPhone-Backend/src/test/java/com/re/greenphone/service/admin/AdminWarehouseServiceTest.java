package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.WarehouseRequest;
import com.re.greenphone.entity.Warehouse;
import com.re.greenphone.mapper.WarehouseMapper;
import com.re.greenphone.repository.WarehouseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;

import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminWarehouseServiceTest {
    @Mock WarehouseRepository repository;
    AdminWarehouseService service;
    final WarehouseRequest request = new WarehouseRequest("WH-DN-HAI-CHAU", " Kho Da Nang ", " Hai Chau ");

    @BeforeEach
    void setup() {
        service = new AdminWarehouseService(repository, Mappers.getMapper(WarehouseMapper.class));
    }

    Warehouse warehouse() {
        Warehouse warehouse = new Warehouse();
        warehouse.setId(1L);
        warehouse.setCode("WH-HN-MAIN");
        warehouse.setName("Ha Noi");
        warehouse.setAddress("Cau Giay");
        return warehouse;
    }

    @Test
    void listsBothActiveAndInactiveWarehousesAsDtos() {
        Warehouse inactive = warehouse();
        inactive.setStatus("INACTIVE");
        when(repository.findAll(Sort.by("id"))).thenReturn(List.of(warehouse(), inactive));
        assertThat(service.getAll()).extracting("status").containsExactly("ACTIVE", "INACTIVE");
    }

    @Test
    void returnsEmptyList() {
        when(repository.findAll(Sort.by("id"))).thenReturn(List.of());
        assertThat(service.getAll()).isEmpty();
    }

    @Test
    void getsDetails() {
        when(repository.findById(1L)).thenReturn(Optional.of(warehouse()));
        assertThat(service.getById(1L).code()).isEqualTo("WH-HN-MAIN");
    }

    @Test
    void createsActiveWarehouseAndTrimsDisplayFields() {
        when(repository.saveAndFlush(any())).thenAnswer(call -> {
            Warehouse saved = call.getArgument(0);
            saved.setId(3L);
            return saved;
        });
        var result = service.create(request);
        assertThat(result.id()).isEqualTo(3L);
        assertThat(result.code()).isEqualTo(request.code());
        assertThat(result.name()).isEqualTo("Kho Da Nang");
        assertThat(result.address()).isEqualTo("Hai Chau");
        assertThat(result.status()).isEqualTo("ACTIVE");
    }

    @Test
    void rejectsDuplicateBeforeSaving() {
        when(repository.existsByCode(request.code())).thenReturn(true);
        assertThatThrownBy(() -> service.create(request)).isInstanceOf(BadRequestException.class);
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void updatesOwnCodeWithoutChangingInactiveStatus() {
        Warehouse warehouse = warehouse();
        warehouse.setStatus("INACTIVE");
        when(repository.findById(1L)).thenReturn(Optional.of(warehouse));
        when(repository.saveAndFlush(warehouse)).thenReturn(warehouse);
        var result = service.update(1L, new WarehouseRequest("WH-HN-MAIN", "Updated", "New address"));
        assertThat(result.name()).isEqualTo("Updated");
        assertThat(result.address()).isEqualTo("New address");
        assertThat(result.status()).isEqualTo("INACTIVE");
        verify(repository).existsByCodeAndIdNot("WH-HN-MAIN", 1L);
    }

    @Test
    void rejectsCodeBelongingToAnotherWarehouse() {
        when(repository.findById(1L)).thenReturn(Optional.of(warehouse()));
        when(repository.existsByCodeAndIdNot(request.code(), 1L)).thenReturn(true);
        assertThatThrownBy(() -> service.update(1L, request)).isInstanceOf(BadRequestException.class);
        verify(repository, never()).saveAndFlush(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACTIVE", "INACTIVE"})
    void changesStatusWithoutDeleting(String status) {
        Warehouse warehouse = warehouse();
        when(repository.findById(1L)).thenReturn(Optional.of(warehouse));
        when(repository.saveAndFlush(warehouse)).thenReturn(warehouse);
        assertThat(service.updateStatus(1L, status).status()).isEqualTo(status);
        verify(repository, never()).delete(any(Warehouse.class));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"DELETED", "active", " ACTIVE "})
    void rejectsInvalidStatus(String status) {
        assertThatThrownBy(() -> service.updateStatus(1L, status)).isInstanceOf(BadRequestException.class);
        verifyNoInteractions(repository);
    }

    @Test
    void missingWarehouseRejectsReadUpdateAndStatusChange() {
        assertThatThrownBy(() -> service.getById(99L)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.update(99L, request)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.updateStatus(99L, "INACTIVE")).isInstanceOf(ResourceNotFoundException.class);
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void mapsConcurrentDuplicateCodeToBadRequest() {
        var sql = new SQLException("Duplicate entry for key 'warehouse.uq_warehouse_code'", "23000", 1062);
        when(repository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("constraint", sql));
        assertThatThrownBy(() -> service.create(request)).isInstanceOf(BadRequestException.class)
                .hasMessage("Warehouse code already exists");
    }

    @Test
    void doesNotMislabelOtherDatabaseFailuresAsDuplicateCode() {
        var failure = new DataIntegrityViolationException("Other constraint", new SQLException("Not null", "23000", 1048));
        when(repository.saveAndFlush(any())).thenThrow(failure);
        assertThatThrownBy(() -> service.create(request)).isSameAs(failure);
    }

    @Test void mainWarehouseCodeCannotBeRenamed() {
        when(repository.findById(1L)).thenReturn(Optional.of(warehouse()));
        assertThatThrownBy(() -> service.update(1L, request)).isInstanceOf(BadRequestException.class)
                .hasMessage("The main warehouse code cannot be changed");
        verify(repository, never()).saveAndFlush(any());
    }
}
