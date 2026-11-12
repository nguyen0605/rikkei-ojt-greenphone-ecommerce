package com.re.greenphone.service.admin;
import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.dto.request.SupplierRequest;
import com.re.greenphone.entity.Supplier;
import com.re.greenphone.mapper.ProcurementMapper;
import com.re.greenphone.repository.SupplierRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
@ExtendWith(MockitoExtension.class)
class AdminSupplierServiceTest {
    @Mock SupplierRepository repository; @Mock ProcurementMapper mapper; @InjectMocks AdminSupplierService service;
    @Test void duplicateCodeRejected() {
        when(repository.existsByCode("SUP-DGW")).thenReturn(true);
        assertThatThrownBy(() -> service.create(new SupplierRequest("SUP-DGW","Digiworld",null,null,null,null))).isInstanceOf(BadRequestException.class);
        verify(repository,never()).saveAndFlush(any());
    }
    @Test void searchFindsTaxCodeAndName() {
        Supplier supplier=new Supplier(); supplier.setName("Digiworld"); supplier.setCode("SUP-DGW"); supplier.setTaxCode("1234567890");
        when(repository.findAll(any(org.springframework.data.domain.Sort.class))).thenReturn(List.of(supplier));
        service.list("123456"); verify(mapper).toResponse(supplier);
    }
    @Test void deactivationPreservesSupplier() {
        Supplier supplier=new Supplier(); when(repository.findById(1L)).thenReturn(Optional.of(supplier));
        service.status(1L,"INACTIVE"); assertThat(supplier.getStatus()).isEqualTo("INACTIVE"); verify(repository).save(supplier); verify(repository,never()).delete(any());
    }
}
